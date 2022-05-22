const { getNodeConfig } = require('@tiddlybase/webpack-config');
const { DIST_ROOT } = require('@tiddlybase/webpack-config/src/plugin-utils');
const path = require('path');

module.exports = () => getNodeConfig({
  input: path.resolve(__dirname, 'src/index.ts'),
  outputDir: path.join(DIST_ROOT, "functions"),
  outputFilename: "index.js"
});
