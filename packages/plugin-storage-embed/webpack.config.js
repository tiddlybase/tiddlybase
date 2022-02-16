const { getTW5PluginConfig } = require('@firebase-auth-loader/webpack-config/webpack-common');
const path = require('path');

module.exports = () => ["production", "development"].map(mode => getTW5PluginConfig({
      input: path.resolve(__dirname, 'src/index.ts'),
      tsConfig: path.resolve(__dirname, 'tsconfig.json'),
      outputFilename: mode === "production" ? "plugin-storage-embed.min.js" : "plugin-storage-embed.js",
      mode
    }));
