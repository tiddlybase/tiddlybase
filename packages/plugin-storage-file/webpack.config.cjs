const { getTW5PluginConfig } = require('@firebase-auth-loader/webpack-config');
const { findPluginSources, toOutputFilename, getOutputPath, getPluginName } = require('@firebase-auth-loader/webpack-config/src/plugin-utils');
const path = require('path');
const pkg = require(path.join(__dirname, 'package.json'));

const sources = findPluginSources();
const tsConfig = path.resolve(__dirname, 'tsconfig.json');
const pluginName = getPluginName(pkg.name);
const outputDir = getOutputPath(pluginName);

module.exports = () => sources.map(input => getTW5PluginConfig({
      outputFilename: toOutputFilename(input),
      input,
      tsConfig,
      outputDir}));
