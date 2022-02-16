const { getTW5PluginConfig } = require('@firebase-auth-loader/webpack-config');
const path = require('path');

module.exports = () => getTW5PluginConfig({
  input: path.resolve(__dirname, 'src/index.ts'),
  tsConfig: path.resolve(__dirname, 'tsconfig.json'),
  outputDir: "dist/plugins/firebase-auth-loader/storage-file",
  outputFilename: "storage-file.js",
});
