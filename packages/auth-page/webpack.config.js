const { getFrontendConfig } = require('@firebase-auth-loader/webpack-config/webpack-common');
const path = require('path');

module.exports = (env, webpackArgs) => {
  return [
    getFrontendConfig({
      input: path.resolve(__dirname, 'src/index.ts'),
      tsConfig: path.resolve(__dirname, 'tsconfig.json'),
      outputFilename: 'auth-page.js',
      mode: webpackArgs.mode
    })
  ];
};
