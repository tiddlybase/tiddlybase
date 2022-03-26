const glob = require('glob');
const path = require('path');
const fs = require('fs');
const util = require('util');

const PROJECT_ROOT = path.resolve(__dirname, '..', "..", "..");

const RE_TS_EXTENSION = /\.ts$/
const RE_PACKAGE_NAME = new RegExp("^@tiddlybase/plugin-([^/]*)");

const META_SUFFIX = '.meta';
const PLUGIN_TITLE_PREFIX = '$:/plugins/tiddlybase/';

const getStaticDir = (packageDir = process.cwd()) => path.resolve(packageDir, "static");

const stripMetaSuffix = filename => filename.substr(0, filename.length - META_SUFFIX.length);

const getAbsolutePluginOutputPath = pluginName => path.resolve(PROJECT_ROOT, getRelativePluginOutputPath(pluginName));

const getRelativePluginOutputPath = pluginName => `dist/plugins/tiddlybase/${pluginName}`;

const getPluginName = packageName => packageName.match(RE_PACKAGE_NAME)?.[1]

const pluginTiddlerTitle = (pluginName, relativeFilename) => `${PLUGIN_TITLE_PREFIX}${pluginName}${relativeFilename ? `/${relativeFilename}` : ''}`

const getJSBasename = absPath => path.basename(absPath).replace(RE_TS_EXTENSION, ".js");

const getJSTiddlerTitle = (pluginName, filename) => pluginTiddlerTitle(pluginName, getJSBasename(filename));

const packageNameToDir = packageName => path.dirname(require.resolve(`${packageName}/package.json`));

const readJSON = filename => JSON.parse(fs.readFileSync(filename, { encoding: 'utf-8' }));

const getCurrentPackageName = () => readJSON(path.resolve(process.cwd(), 'package.json')).name

// returns relative path of source files with accompanying '.meta' files.
const findPluginSources = (packageDir = process.cwd()) => {
  const metaFiles = glob.sync(path.join(packageDir, `/**/*${META_SUFFIX}`), {
    cwd: packageDir
  });
  return metaFiles.map(stripMetaSuffix).filter(fs.existsSync);
}

const parseMetaLine = line => {
  const key = line.split(":", 1)[0];
  const value = line.substr(key.length + 1).trim();
  return [key, value];
}

const parseMeta = metaStr => {
  return Object.fromEntries(metaStr.split("\n")
    .map(s => s.trim())
    .filter(s => s.length > 1)
    .map(parseMetaLine));
}

const readMeta = filename => parseMeta(fs.readFileSync(filename, { encoding: 'utf-8' }));

const stringifyMeta = metaObj => Object.entries(metaObj).sort().map(([k, v]) => `${k}: ${v}`).join("\n")

const getBanner = (sourceFile, outputDir, outputFilename) => {
  const bannerFile = `${sourceFile}${META_SUFFIX}`;
  if (fs.existsSync(bannerFile)) {
    metadata = readMeta(bannerFile);
    if (!('title' in metadata)) {
      metadata.title = getJSTiddlerTitle(
        path.basename(outputDir),
        sourceFile
      );
    }
    if (!('type' in metadata)) {
      metadata.type = 'application/javascript'
    }
    return `/*\\\n${stringifyMeta(metadata)}\n\\*/\n`;
  }
  return "";
};

const getPluginTiddlerTitle = importName => {
  // eg: @tiddlybase/plugin-adaptors-lib/src/url
  const pluginName = getPluginName(importName)
  if (!pluginName) {
    return;
  }
  const parts = importName.split("/");
  const packageName = parts.slice(0, 2).join("/");
  const packageSubPath = parts.slice(2).join("/");
  // we need to find the directory of the package
  const packageDir = packageNameToDir(packageName);
  const fullPath = glob.sync(`${packageDir}/${packageSubPath}.{js,ts}`)?.[0]
  if (!fullPath) {
    return;
  }
  const metaFilename = fullPath + META_SUFFIX
  let tiddlerTitle = getJSTiddlerTitle(pluginName, fullPath);
  if (fs.existsSync(metaFilename)) {
    const metadata = readMeta(metaFilename);
    if ('title' in metadata) {
      tiddlerTitle = metadata.title;
    }
  }
  return tiddlerTitle;
}



const writePluginInfo = pkg => {

  const pluginName = getPluginName(pkg.name);
  const outputDir = getAbsolutePluginOutputPath(pluginName);

  const title = pluginTiddlerTitle(pluginName);

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

// from: https://github.com/webpack-contrib/copy-webpack-plugin#transform
// transform: ((input: string, absoluteFilename: string) => string | Buffer);
const transformMetaAddTitle = (content, absoluteFilename) => {
  if (absoluteFilename.endsWith(META_SUFFIX)) {
    metadata = parseMeta(content.toString());
    if (!('title' in metadata)) {
      const pluginName = getPluginName(getCurrentPackageName())
      metadata.title = pluginTiddlerTitle(
        pluginName,
        path.relative(getStaticDir(), absoluteFilename)
      );
    }
    return stringifyMeta(metadata);
  }
  return content;
};



module.exports = { findPluginSources, getJSBasename, getPluginName, getRelativePluginOutputPath, getPluginTiddlerTitle, writePluginInfo, getBanner, PROJECT_ROOT, transformMetaAddTitle, getStaticDir }
