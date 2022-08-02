const { getFrontendConfig, getTW5PluginConfig } = require('@tiddlybase/webpack-config');
const { getOutputForSourceFile, findPluginSources, removePluginPrefix, writePluginInfo, getBanner } = require('@tiddlybase/webpack-config/src/plugin-utils');
const path = require('path');
const pkg = require(path.join(__dirname, 'package.json'));
const sources = findPluginSources();
const tsConfig = path.resolve(__dirname, 'tsconfig.json');
const bootSource = "src/tiddlybase-boot.ts"

writePluginInfo(pkg);

module.exports = () => sources
  // first, "normal" plugin tiddlers
  .filter(s => !s.endsWith(bootSource))
  .map((input, ix) => getTW5PluginConfig({
    ...getOutputForSourceFile(input),
    input,
    tsConfig,
    // only copy static for the last entry
    copyStatic: false
  })).concat(sources
    // then, tiddlybase-boot.ts
    .filter(s => s.endsWith(bootSource))
    .map((input, ix) => getFrontendConfig({
      ...getOutputForSourceFile(input),
      input,
      tsConfig,
      copyStatic: true,
      banner: getBanner(input)
    })));
