const { getTW5PluginConfig } = require('@tiddlybase/webpack-config');
const { findPluginSources, getJSBasename, getRelativePluginOutputPath, getPluginName, writePluginInfo } = require('@tiddlybase/webpack-config/src/plugin-utils');
const path = require('path');
const pkg = require(path.join(__dirname, 'package.json'));

const sources = findPluginSources(path.join(__dirname, 'src', 'widget'));
const tsConfig = path.resolve(__dirname, 'tsconfig-widget.json');
const pluginName = getPluginName(pkg.name);
const outputDir = getRelativePluginOutputPath(pluginName);

writePluginInfo(pkg);
console.log("tsConfig", tsConfig);

module.exports = () => {
    const r = sources.map(input => getTW5PluginConfig({
      outputFilename: getJSBasename(input),
      input,
      tsConfig,
      outputDir}));
    console.log(r[0].resolve.plugins.TsconfigPathsPlugin);
    return r;
};
