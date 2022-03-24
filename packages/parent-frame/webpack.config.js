const { getFrontendConfig } = require('@firebase-auth-loader/webpack-config');
const path = require('path');

module.exports = () => getFrontendConfig({
  input: path.resolve(__dirname, 'src/index.ts'),
  tsConfig: path.resolve(__dirname, 'tsconfig.json'),
  outputFilename: "parent-frame.js"
});
