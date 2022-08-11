const { getFrontendConfig, TIDDLYBASE_PUBLIC } = require('@tiddlybase/webpack-config');
const path = require('path');

const input = path.resolve(__dirname, 'src/index.ts');

module.exports = () => getFrontendConfig({
  input,
  outputDir: TIDDLYBASE_PUBLIC,
  outputFilename: "top-level-frame.js"
});
