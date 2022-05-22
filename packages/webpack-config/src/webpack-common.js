const webpack = require('webpack');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const fs = require('fs');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const {PROJECT_ROOT, getExternalImportPath, getBanner, transformMetaAddTitle, getStaticSourceDir, getStaticTargetDir, TW5_SHADOW_TIDDLER_PREFIX} = require('./plugin-utils');

const MODULES_DIR = path.resolve(PROJECT_ROOT, 'node_modules');

const EXTERNAL_MODULES = {
    // make firebase and firebase-ui external
    // firebase: 'global firebase',
    // firebaseui: 'global firebaseui',
    // defined in plugin-react package
    'react': 'commonjs $:/plugins/tiddlybase/react/react.js',
    'react-dom': 'commonjs $:/plugins/tiddlybase/react/react-dom.js',
    'react-dom/client': 'commonjs $:/plugins/tiddlybase/react/react-dom.js',
    'react/jsx-runtime': 'commonjs $:/plugins/tiddlybase/react/react-jsx-runtime.js'
}

const getBaseConfig = ({
  input,
  outputFilename,
  outputDir, // relative output dir (to project root)
  outputSubdir = '',
  tsConfig = path.resolve(process.cwd(), 'tsconfig.json'),
  mode = process.env['MODE'] ?? 'production',
}) => ({
  mode,
  entry: input,
  devtool: 'source-map',
  output: {
    path: path.join(outputDir, outputSubdir),
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
    plugins: [ new TsconfigPathsPlugin({configFile: tsConfig}) ]
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
      allowlist: [/^@tiddlybase/],
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
  if (baseOptions.copyStatic !== false) {
    const copyOptions = {
      from: getStaticSourceDir(),
      to: getStaticTargetDir(baseOptions.outputDir),
      transform: transformMetaAddTitle
    }
    if (fs.existsSync(copyOptions.from)) {
      console.log(`COPYING STATIC ${copyOptions.from} -> ${copyOptions.to}`)
      config.plugins.push(new CopyWebpackPlugin({
        patterns: [
          copyOptions
        ]
      }));
    }
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
      EXTERNAL_MODULES,
      function ({ contextInfo: {issuer: importedBy}, request: importName }, callback) {
        // if importedBy is '', then this is not a real import, it's the file being processed
        // we should not report it as external.

        if (importedBy === '') {
          return callback();
        }

        let externalPath;
        // for some reason, react-dom/client gets through, although that should be obviously external
        // check again here:
        if (importName in EXTERNAL_MODULES) {
          externalPath = EXTERNAL_MODULES[importName];
        }
        if (!externalPath) {
          try {
            const result = getExternalImportPath(importedBy, importName);
            if (result) {
              externalPath = `commonjs ${result}`
            }
          } catch (e) {
            console.log(e.stack);
          }

        }

        if (externalPath) {
          console.log(`MAPPING EXTERNAL IMPORT IN ${importedBy} : ${importName} -> ${externalPath}`);
          // Externalize to a commonjs module using the request path
          return callback(null, externalPath);
        }
        console.log(`NONEXTERNAL IMPORT IN  ${importedBy} : ${importName}`);
        // Continue without externalizing the import
        return callback();
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
                preamble: getBanner(config.entry, options.outputDir, options.outputSubdir, options.outputFilename, options.sourcePrefix),
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
          banner: getBanner(config.entry, options.outputDir, options.outputSubdir, options.outputFilename, options.sourcePrefix),
          raw: true,
        }),
      );
  }
  return config;
};

module.exports = { getNodeConfig, getFrontendConfig, getTW5PluginConfig};
