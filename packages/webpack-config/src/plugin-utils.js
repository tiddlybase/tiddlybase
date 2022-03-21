const glob = require('glob');
const path = require('path');
const fs = require('fs');
const util = require('util');

const RE_EXTENSION = /\.ts$/

const META_SUFFIX = '.meta';

const stripMeta = filename => filename.substr(0, filename.length - META_SUFFIX.length);

// returns relative path of source files with accompanying '.meta' files.
const findPluginSources = (dir=process.cwd()) => {
  const metaFiles = glob.sync(path.join(dir, `/**/*${META_SUFFIX}`), {
    cwd: dir
  });
  return metaFiles.map(stripMeta).filter(fs.existsSync);
}

const getOutputPath = pluginName => outputDir = `dist/plugins/firebase-auth-loader/${pluginName}`;

const getPluginName = packageName => packageName.match("/plugin-(.*)$")[1]

const toOutputFilename = filename => path.basename(filename).replace(RE_EXTENSION, ".js");

module.exports = {findPluginSources, toOutputFilename, getOutputPath, getPluginName}
