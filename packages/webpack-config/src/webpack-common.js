const webpack = require('webpack');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const fs = require('fs');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { getOutputPath } = require('./plugin-utils');
const {PROJECT_ROOT, getPluginTiddlerTitle, getBanner} = require('./plugin-utils');

const MODULES_DIR = path.resolve(PROJECT_ROOT, 'node_modules');


const getBaseConfig = ({
  input,
  outputFilename,
  outputDir = 'dist', // relative output dir (to project root)
  tsConfig = path.resolve(PROJECT_ROOT, 'tsconfig.json'),
  mode = process.env['MODE'] ?? 'production',
}) => ({
  mode,
  entry: path.resolve(PROJECT_ROOT, input),
  devtool: 'source-map',
  output: {
    path: path.resolve(PROJECT_ROOT, outputDir),
    filename: outputFilename,
    globalObject: 'globalThis',
  },
  stats: {
    errorDetails: true,
    logging: mode === 'production' ? 'info' : 'verbose'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: tsConfig,
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    modules: [MODULES_DIR],
    extensions: ['.json', '.js', '.tsx', '.ts'],
    plugins: [ new TsconfigPathsPlugin() ]
  },
  plugins: [],
});

const getNodeConfig = (baseOptions) => {
  const nodeExternals = require('webpack-node-externals');
  const nodeConfig = getBaseConfig({
    ...baseOptions,
    mode: 'development',
  });
  Object.assign(nodeConfig, {
    target: 'node',
    externalsPresets: {
      node: true,
    },
    externals: [nodeExternals({
      allowlist: [/^@firebase-auth-loader/],
      modulesDir: MODULES_DIR
    })],
    node: {
      __dirname: true, // Webpack has to manually solve __dirname references
    }
  });
  Object.assign(nodeConfig.output, {
    libraryTarget: 'this',
    umdNamedDefine: true,
  });
  return nodeConfig;
};

const getFrontendConfig = (baseOptions) => {
  const config = getBaseConfig(baseOptions);
  config.plugins.push(
    new webpack.SourceMapDevToolPlugin({
      filename: '[file].map',
      publicPath: '/sourcemaps/',
    }),
  );
  // if static dif exists, copy files from static to dist dir
  const staticDir = path.resolve(process.cwd(), "static");
  if (fs.existsSync(staticDir)) {
    config.plugins.push(new CopyWebpackPlugin({
      patterns: [
        { from: 'static' }
      ]
    }));
  }
  Object.assign(config.output, {
    library: { type: 'window' }
  });
  config.optimization = config.mode === 'production'
    ? {
        minimize: true,
        minimizer: [new TerserPlugin()]
      }
    : { minimize: false };
  return config;
};

const getTW5PluginConfig = (options) => {
  const config = getFrontendConfig(options);
  Object.assign(config, {
    externals: [
      {
        // make firebase and firebase-ui external
        // firebase: 'global firebase',
        // firebaseui: 'global firebaseui',
      },
      function ({ context, request }, callback) {
        if (request.startsWith('$:/')) {
          // Externalize to a commonjs module using the request path
          return callback(null, 'commonjs ' + request);
        }
        const pluginTiddlerTitle = getPluginTiddlerTitle(request);
        if (pluginTiddlerTitle) {
          return callback(null, 'commonjs ' + pluginTiddlerTitle);
        }
        // Continue without externalizing the import
        callback();
      },
    ],
  });
  Object.assign(config.output, {
    library: { type: 'commonjs' },
    globalObject: 'globalThis',
  });
  if (config.mode === 'production') {
      config.optimization.minimizer = [
          new TerserPlugin({
            terserOptions: {
              output: {
                preamble: getBanner(config.entry, options.outputDir, options.outputFilename),
                comments: false,
              },
            },
            extractComments: false,
          }),
        ]
  } else { // dev build
      // BannerPlugin is only used in dev mode
      config.plugins.push(
        new webpack.BannerPlugin({
          banner: getBanner(config.entry, options.outputDir, options.outputFilename),
          raw: true,
        }),
      );
  }
  return config;
};

module.exports = { getNodeConfig, getFrontendConfig, getTW5PluginConfig};
