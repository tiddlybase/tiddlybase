const { getTW5PluginConfig } = require('@firebase-auth-loader/webpack-config');
const path = require('path');

module.exports = () => ["production", "development"].map(mode => getTW5PluginConfig({
      input: path.resolve(__dirname, 'src/index.ts'),
      tsConfig: path.resolve(__dirname, 'tsconfig.json'),
      outputDir: "dist/plugins/firebase-auth-loader/storage-file",
      outputFilename: mode === "production" ? "storage-file.min.js" : "storage-file.js",
      mode
    }));
