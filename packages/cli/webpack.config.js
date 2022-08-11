const { getNodeConfig } = require('@tiddlybase/webpack-config');
const path = require('path');

module.exports = () => getNodeConfig({
  input: path.resolve(__dirname, 'src/cli.ts'),
  outputDir: path.join(__dirname, "dist"),
  outputFilename: "tiddlybase"
});
