const { getNodeConfig } = require('@tiddlybase/webpack-config');
const path = require('path');

module.exports = () => getNodeConfig({
  input: path.resolve(__dirname, 'src/index.ts'),
  tsConfig: path.resolve(__dirname, 'tsconfig.json'),
  outputDir: "dist/functions",
  outputFilename: "index.js"
});
