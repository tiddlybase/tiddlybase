const webpack = require('webpack');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const fs = require('fs');
const CopyWebpackPlugin = require('copy-webpack-plugin');
 
const PROJECT_ROOT = path.resolve(__dirname, '..', "..");
const MODULES_DIR = path.resolve(PROJECT_ROOT, 'node_modules');

console.log("MODE is " + process.env['MODE']);

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
    tsConfig: path.resolve(__dirname, 'tsconfig-node.json'),
  });
  Object.assign(nodeConfig, {
    target: 'node',
    externalsPresets: {
      node: true,
    },
    externals: [nodeExternals({ MODULES_DIR })],
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
  const getBanner = () => {
    let banner = '';
    const bannerFile = `${config.entry}.meta`;
    if (fs.existsSync(bannerFile)) {
      banner = fs.readFileSync(bannerFile, { encoding: 'utf-8' });
    }
    return `/*\\\n${banner}\n\\*/\n`;
  };
  Object.assign(config, {
    externals: [
      {
        // make firebase and firebase-ui external
        // firebase: 'global firebase',
        // firebaseui: 'global firebaseui',
      },
      function ({ context, request }, callback) {
        // console.log("externals", context, request);
        if (request.startsWith('$:/')) {
          // Externalize to a commonjs module using the request path
          return callback(null, 'commonjs ' + request);
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
  config.plugins.push(new CopyWebpackPlugin({
    patterns: [
      { from: 'static' }
    ]
  }));
  if (config.mode === 'production') {
      config.optimization.minimizer = [
          new TerserPlugin({
            terserOptions: {
              output: {
                preamble: getBanner(),
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
          banner: getBanner(),
          raw: true,
        }),
      );
  }
  
  return config;
};

module.exports = { getNodeConfig, getFrontendConfig, getTW5PluginConfig };
