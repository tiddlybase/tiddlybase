const { getTW5PluginConfig } = require('@tiddlybase/webpack-config');
const { getOutputForSourceFile, findPluginSources, writePluginInfo } = require('@tiddlybase/webpack-config/src/plugin-utils');
const path = require('path');
const pkg = require(path.join(__dirname, 'package.json'));

const sources = findPluginSources();
const tsConfig = path.resolve(__dirname, 'tsconfig.json');

writePluginInfo(pkg);

module.exports = () => sources.map((input, ix) => getTW5PluginConfig({
      ...getOutputForSourceFile(input),
      input,
      tsConfig,
      // only copy static for the first entry
      copyStatic: ix===0
    }));
