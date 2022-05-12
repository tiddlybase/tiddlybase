const { getTW5PluginConfig } = require('@tiddlybase/webpack-config');
const { findPluginSources, getJSBasename, getPluginName, writePluginInfo } = require('@tiddlybase/webpack-config/src/plugin-utils');
const path = require('path');
const pkg = require(path.join(__dirname, 'package.json'));

const sources = findPluginSources(path.join(__dirname, 'test'));
const tsConfig = path.resolve(__dirname, 'tsconfig.json');
const pluginName = getPluginName(pkg.name);
const outputDir = path.resolve(__dirname, 'browser-tests/tiddlers/generated');

module.exports = () => sources.map(input => getTW5PluginConfig({
      copyStatic: false,
      outputFilename: getJSBasename(input),
      input,
      tsConfig,
      outputDir}));
