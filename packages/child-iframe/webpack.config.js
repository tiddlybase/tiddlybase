const { getFrontendConfig } = require('@tiddlybase/webpack-config');
const { getOutputForSourceFile, DIST_ROOT} = require('@tiddlybase/webpack-config/src/plugin-utils');
const path = require('path');

const input = path.resolve(__dirname, 'src/start-wiki.ts');

module.exports = () => [getFrontendConfig({
  ...getOutputForSourceFile(input),
  input,
  outputDir: DIST_ROOT,
  outputFilename: "child-frame.js"
})];
