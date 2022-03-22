const glob = require('glob');
const path = require('path');
const fs = require('fs');
const util = require('util');

const PROJECT_ROOT = path.resolve(__dirname, '..', "..", "..");

const RE_EXTENSION = /\.ts$/
const RE_PACKAGE_NAME = new RegExp("^@firebase-auth-loader/plugin-([^/]*)");

const META_SUFFIX = '.meta';
const PLUGIN_TITLE_PREFIX = '$:/plugins/firebase-auth-loader/';

const stripMetaSuffix = filename => filename.substr(0, filename.length - META_SUFFIX.length);

const getOutputPath = pluginName => outputDir = path.resolve(PROJECT_ROOT, `dist/plugins/firebase-auth-loader/${pluginName}`);

const getPluginName = packageName => packageName.match(RE_PACKAGE_NAME)?.[1]

// returns relative path of source files with accompanying '.meta' files.
const findPluginSources = (dir=process.cwd()) => {
  const metaFiles = glob.sync(path.join(dir, `/**/*${META_SUFFIX}`), {
    cwd: dir
  });
  return metaFiles.map(stripMetaSuffix).filter(fs.existsSync);
}

const parseMetaLine = line => {
  const key = line.split(":", 1)[0];
  const value = line.substr(key.length+1).trim();
  return [key, value];
}

const parseMeta = metaStr => {
  return Object.fromEntries(metaStr.split("\n")
    .map(s => s.trim())
    .filter(s => s.length > 1)
    .map(parseMetaLine));
}

const readMeta = filename => parseMeta(fs.readFileSync(filename, { encoding: 'utf-8' }));

const pluginTitle = (pluginName, filename) => `${PLUGIN_TITLE_PREFIX}${pluginName}/${toOutputFilename(filename)}`

const stringifyMeta = metaObj => Object.entries(metaObj).sort().map(([k, v]) => `${k}: ${v}`).join("\n")

const getBanner = (sourceFile, outputDir, outputFilename) => {
  const bannerFile = `${sourceFile}${META_SUFFIX}`;
  if (fs.existsSync(bannerFile)) {
    metadata = readMeta(bannerFile);
    if (!('title' in metadata)) {
      metadata.title = pluginTitle(path.relative(getOutputPath('.'), outputDir), outputFilename);
    }
    if (!('type' in metadata)) {
      metadata.type = 'application/javascript'
    }
    return `/*\\\n${stringifyMeta(metadata)}\n\\*/\n`;
  }
  return "";
};

const getPluginTiddlerTitle = importName => {
  // eg: @firebase-auth-loader/plugin-adaptors-lib/src/url
  if (!getPluginName(importName)) {
    return;
  }
  const parts = importName.split("/");
  const packageName = parts.slice(0,2).join("/");
  const packageSubPath = parts.slice(2).join("/");
  // we need to find the directory of the package
  const packageDir = path.dirname(require.resolve(`${packageName}/package.json`));
  const fullPath = glob.sync(`${packageDir}/${packageSubPath}.{js,ts}`)?.[0]
  if (!fullPath) {
    return;
  }
  const metaFilename = fullPath + META_SUFFIX
  let tiddlerTitle = pluginTitle(getPluginName(packageName), toOutputFilename(fullPath))
  if (fs.existsSync(metaFilename)) {
    const metadata = readMeta(metaFilename);
    if ('title' in metadata) {
      tiddlerTitle = metadata.title;
    }
  }
  return tiddlerTitle;
}

const toOutputFilename = filename => path.basename(filename).replace(RE_EXTENSION, ".js");

const writePluginInfo = pkg => {

  const pluginName = getPluginName(pkg.name);
  const outputDir = getOutputPath(pluginName);

  const title = `$:/plugins/firebase-auth-loader/${pluginName}`;

  const info = {
    title,
    name: pluginName,
    description: pkg.description,
    contributor: pkg.author,
    // TODO
    list: []
  }

  const filename = path.join(outputDir, 'plugin.info');

  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(filename, JSON.stringify(info, null, 4), 'utf-8');

  console.log(`Wrote ${filename}`);

}



module.exports = {findPluginSources, toOutputFilename, getOutputPath, getPluginName, getPluginTiddlerTitle, writePluginInfo, getBanner, PROJECT_ROOT}
