const webpack = require('webpack');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..', "..");
const MODULES_DIR = path.resolve(PROJECT_ROOT, 'node_modules');

const getBaseConfig = ({
  input,
  outputFilename,
  outputDir = 'dist', // relative output dir (to project root)
  tsConfig = path.resolve(PROJECT_ROOT, 'tsconfig.json'),
  mode = 'production',
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
  return config;
};

const getTW5PluginConfig = (baseOptions) => {
  const pluginConfig = getBaseConfig(baseOptions);
  const isProduction = pluginConfig.mode !== 'development';
  const getBanner = () => {
    let banner = '';
    const bannerFile = `${pluginConfig.entry}.meta`;
    if (fs.existsSync(bannerFile)) {
      banner = fs.readFileSync(bannerFile, { encoding: 'utf-8' });
    }
    return `/*\\\n${banner}\n\\*/\n`;
  };
  Object.assign(pluginConfig, {
    externals: [
      {
        // make firebase and firebase-ui external
        firebase: 'global firebase',
        firebaseui: 'global firebaseui',
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
  Object.assign(pluginConfig.output, {
    library: { type: 'commonjs' },
    globalObject: 'globalThis',
  });
  // override loaders to include babel and non TS sources (js, css):
  pluginConfig.module.rules = [
    {
      test: /\.tsx?$/,
      use: [
        {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig-browser.json'),
          },
        },
      ],
      exclude: /node_modules/,
    }
  ];
  pluginConfig.plugins.push(
    new webpack.SourceMapDevToolPlugin({
      filename: '[file].map',
      publicPath: '/sourcemaps/',
      //fileContext: 'dist',
    }),
  );
  // BannerPlugin is only used in dev mode
  if (!isProduction) {
    pluginConfig.plugins.push(
      new webpack.BannerPlugin({
        banner: getBanner(),
        raw: true,
      }),
    );
  }
  pluginConfig.optimization = isProduction
    ? {
        minimize: true,
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              output: {
                preamble: getBanner(),
                comments: false,
              },
            },
            extractComments: false,
          }),
        ],
      }
    : { minimize: false };
  return pluginConfig;
};

const getDefaultWikiLocation = () => {
    const buildConfig = JSON.parse(process.env.BUILD_CONFIG ?? '{}');
    return buildConfig.defaultWikiLocation ?? {};
}

const getTW5PrebootConfig = (pluginOptions) => {
  const prebootConfig = getTW5PluginConfig(pluginOptions);
  prebootConfig.output.library.type = 'window';
  return prebootConfig;
};

const getOuterConfig = (pluginOptions) => {
  const config = getTW5PluginConfig(pluginOptions);
  config.plugins.push(
    new webpack.DefinePlugin(
      '__DEFAULT_WIKI_LOCATION__',
      JSON.stringify(getDefaultWikiLocation())));
  config.output.library.type = 'window';
  return config;
};

module.exports = { getNodeConfig, getFrontendConfig, getTW5PluginConfig, getTW5PrebootConfig, getOuterConfig };
