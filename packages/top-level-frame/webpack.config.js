const { getFrontendConfig } = require('@tiddlybase/webpack-config');
const { DIST_ROOT} = require('@tiddlybase/webpack-config/src/plugin-utils');
const path = require('path');

const input = path.resolve(__dirname, 'src/index.ts');

module.exports = () => getFrontendConfig({
  input,
  outputDir: DIST_ROOT,
  outputFilename: "top-level-frame.js"
});
