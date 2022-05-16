const { getTW5PluginConfig } = require('@tiddlybase/webpack-config');
const { findPluginSources, getJSBasename } = require('@tiddlybase/webpack-config/src/plugin-utils');
const path = require('path');

const sources = findPluginSources(path.join(__dirname, 'test'));
const tsConfig = path.resolve(__dirname, 'tsconfig.json');
const outputDir = path.resolve(__dirname, 'browser-tests/tiddlers/generated');

module.exports = () => sources.map(input => getTW5PluginConfig({
      copyStatic: false,
      outputFilename: getJSBasename(input),
      input,
      tsConfig,
      outputDir}));
