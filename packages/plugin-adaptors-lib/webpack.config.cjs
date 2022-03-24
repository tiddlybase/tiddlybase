const { getTW5PluginConfig } = require('@tiddlybase/webpack-config');
const { findPluginSources, toOutputFilename, getOutputPath, getPluginName, writePluginInfo } = require('@tiddlybase/webpack-config/src/plugin-utils');
const path = require('path');
const pkg = require(path.join(__dirname, 'package.json'));

const sources = findPluginSources();
const tsConfig = path.resolve(__dirname, 'tsconfig.json');
const pluginName = getPluginName(pkg.name);
const outputDir = getOutputPath(pluginName);

writePluginInfo(pkg);

module.exports = () => sources.map(input => getTW5PluginConfig({
      outputFilename: toOutputFilename(input),
      input,
      tsConfig,
      outputDir}));
