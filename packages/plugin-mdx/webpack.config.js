const { getTW5PluginConfig } = require('@tiddlybase/webpack-config');
const { getOutputForSourceFile, findPluginSources, removePluginPrefix, writePluginInfo } = require('@tiddlybase/webpack-config/src/plugin-utils');
const path = require('path');
const pkg = require(path.join(__dirname, 'package.json'));

const sources = findPluginSources(path.join(__dirname, 'src', 'widget'));
const tsConfig = path.resolve(__dirname, 'tsconfig-widget.json');
const pluginName = removePluginPrefix(path.basename(process.cwd()));

writePluginInfo(pkg);

module.exports = () => sources.map((input, ix) => getTW5PluginConfig({
      ...getOutputForSourceFile(input),
      input,
      tsConfig,
      // only copy static for the first entry
      copyStatic: ix===0
    }));
