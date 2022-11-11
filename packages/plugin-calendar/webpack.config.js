const { getTW5PluginConfig } = require('@tiddlybase/webpack-config');
const { getOutputForSourceFile, findPluginSources, removePluginPrefix, writePluginInfo } = require('@tiddlybase/webpack-config/src/plugin-utils');
const path = require('path');
const pkg = require(path.join(__dirname, 'package.json'));

const sources = findPluginSources();
const tsConfig = path.resolve(__dirname, 'tsconfig.json');
const pluginName = removePluginPrefix(path.basename(process.cwd()));

writePluginInfo(pkg);

module.exports = () => sources.map((input, ix) => {
    const config = getTW5PluginConfig({
      ...getOutputForSourceFile(input),
      input,
      tsConfig,
      // only copy static for the first entry
      copyStatic: ix===0
    })
    // Add CSS loader support as per https://webpack.js.org/loaders/css-loader/
    config.module.rules.push({
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
    });
    return config;
});
