const { getFrontendConfig } = require('@firebase-auth-loader/webpack-config/webpack-common');
const path = require('path');

module.exports = () => ["production", "development"].map(mode => getFrontendConfig({
      input: path.resolve(__dirname, 'src/index.ts'),
      tsConfig: path.resolve(__dirname, 'tsconfig.json'),
      outputFilename: mode === "production" ? "child-frame.min.js" : "child-frame.js",
      mode
    }));
