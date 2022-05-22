const glob = require('glob');
const path = require('path');
const fs = require('fs');
const util = require('util');

const PROJECT_ROOT = path.resolve(__dirname, '..', "..", "..");

const PLUGIN_PREFFIX = "plugin-";
const PACKAGES_DIR = 'packages';
const STATIC_DIR = 'static';
const DIST_DIR = 'dist'

const SOURCE_PREFIX = 'src';

const SOURCE_PACKAGES_ROOT = path.resolve(PROJECT_ROOT, PACKAGES_DIR);

const DIST_ROOT = path.resolve(PROJECT_ROOT,
  DIST_DIR);

const PLUGIN_OUTPUT_ROOT = path.resolve(DIST_ROOT,
  'plugins',
  'tiddlybase')

const OUTPUT_ROOT = path.join(PROJECT_ROOT, DIST_DIR);

const EXTERNALIZED_PACKAGE_BLACKLIST = ["tw5-types"]

const RE_TS_EXTENSION = /\.tsx?$/
const RE_PACKAGE_NAME = new RegExp("^@tiddlybase/(plugin-[^/]*).*$");

const META_SUFFIX = '.meta';
const TW5_SHADOW_TIDDLER_PREFIX = '$:/';
const PLUGIN_TITLE_PREFIX = `${TW5_SHADOW_TIDDLER_PREFIX}plugins/tiddlybase/`;

const getStaticSourceDir = (packageDir = process.cwd()) => path.resolve(packageDir, STATIC_DIR);
const getStaticTargetDir = (outputDir) => outputDir;

const stripMetaSuffix = filename => filename.replace(new RegExp(`${META_SUFFIX}$`), '');

const getAbsolutePluginOutputPath = pluginName => path.resolve(PLUGIN_OUTPUT_ROOT, pluginName);

const getPackageNameFromPackageImport = packageName => packageName.match(RE_PACKAGE_NAME)?.[1]

const pluginTiddlerTitle = (pluginName, relativeFilename) => path.join(PLUGIN_TITLE_PREFIX, pluginName, relativeFilename);

const fixTSExtension = filename => filename.replace(RE_TS_EXTENSION, ".js");

const getJSBasename = filename => path.basename(fixTSExtension(filename));

const getOutputForSourceFile = (inputFile, subDir=SOURCE_PREFIX) => {
  const relativePackagePath = path.relative(SOURCE_PACKAGES_ROOT, inputFile);
  const packageDir = relativePackagePath.split('/')[0];
  const pluginName = removePluginPrefix(packageDir);
  const outputDir = getAbsolutePluginOutputPath(pluginName);
  const outputSubdir = path.dirname(path.relative(path.join(SOURCE_PACKAGES_ROOT, packageDir, subDir), inputFile)); //stripSourcePrefix(path.dirname(path.join(SOURCE_PACKAGES_ROOT, packageDir)), SOURCE_PREFIX)
  const outputFilename = fixTSExtension(path.basename(inputFile));
  const outputTiddler = pluginTiddlerTitle(pluginName, path.join(outputSubdir, outputFilename))
  return {
    outputDir,
    outputSubdir,
    outputFilename,
    outputTiddler
  };
}

const readJSON = filename => JSON.parse(fs.readFileSync(filename, { encoding: 'utf-8' }));

const getCurrentPackageName = () => readJSON(path.resolve(process.cwd(), 'package.json')).name

// returns relative path of source files with accompanying '.meta' files.
const findPluginSources = (sourceDir = path.join(process.cwd(), SOURCE_PREFIX)) => {
  const metaFiles = glob.sync(path.join(sourceDir, `/**/*${META_SUFFIX}`), {
    cwd: sourceDir
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

const getBanner = (sourceFile) => {
  const bannerFile = `${sourceFile}${META_SUFFIX}`;
  if (fs.existsSync(bannerFile)) {
    metadata = readMeta(bannerFile);
    if (!('title' in metadata)) {
      const {outputTiddler} = getOutputForSourceFile(sourceFile);
      metadata.title = outputTiddler
    }
    if (!('type' in metadata)) {
      metadata.type = 'application/javascript'
    }
    return `/*\\\n${stringifyMeta(metadata)}\n\\*/\n`;
  }
  return "";
};

const getPackageNameFromAbsolutePath = absPath => {
  const relPath = path.relative(PROJECT_ROOT, absPath);
  const match = relPath.match(new RegExp("^packages/([^/]*).*$"));
  if (match) {
    return match[1];
  }
}

const findExtension = filenameWithoutExtension => glob.sync(`${filenameWithoutExtension}.{js,ts,tsx}`)?.[0];

const removePluginPrefix = packageName => packageName.replace(/^plugin-/,'')

const isAbsolutePath = filename => filename.startsWith('/');
const isRelativePath = filename => filename.startsWith('./');
const isTWModule = importName => importName.startsWith(TW5_SHADOW_TIDDLER_PREFIX);
const isTiddlybaseImport = importName => importName.startsWith('@tiddlybase/');

const getFilenameForImport = (importedBy, importName) => {
  if (isAbsolutePath(importName)) {
    return importName
  }
  if (isRelativePath(importName)) {
    return path.join(path.dirname(importedBy), importName);
  }
  if (isTiddlybaseImport(importName)) {
    return importName.replace('@tiddlybase', SOURCE_PACKAGES_ROOT);
  }
  // node modules shouldn't be resolved unless they're tiddlybase imports
};

const hasExtension = filename => filename.match(/.*\.[\w]{2,4}$/)

const getExternalImportPath = (importedBy, importName) => {
  /* importName can be
    * node module, eg: 'tslib', 'react-dom/client'
    * tiddlywiki module name, eg: '$:/core/modules/widgets/widget.js',
    * tiddlybase import '@tiddlybase/plugin-react/src/dom-removal-detector',
    * relative filename: './components/error',
    * abolute filename: '/Users/neumark/git/tiddlybase/packages/plugin-react/src/react-base-widget.ts',

    In summary they may be absolute or relative and they may or may not contain the extension
  */
  if (isTWModule(importName)) {
    // the import is external by definition
    return importName
  }
  // let's start by getting the filename (potentially without extension)
  const absFilenameWithoutExtension = getFilenameForImport(importedBy, importName);
  let absFilename;
  if (absFilenameWithoutExtension) {
    absFilename = hasExtension(absFilenameWithoutExtension) ? absFilenameWithoutExtension : findExtension(absFilenameWithoutExtension)
    if (!absFilename) {
      // if the extension couldn't be found, try again assuming it's a directory with an implicit 'index.*' postfix
      absFilename = findExtension(path.join(absFilenameWithoutExtension, 'index'))
    }
  }
  if (!absFilename) {
    // could not find absolute filename for file, don't treat as external
    return
  }
  // check if package to which filename belongs is on blacklist
  const packageName = getPackageNameFromAbsolutePath(absFilename);
  if (EXTERNALIZED_PACKAGE_BLACKLIST.includes(packageName)) {
    return;
  }
  // verify that the source file has an accompanying .meta file
  const metaFilename = absFilename + META_SUFFIX;
  let metadata;
  if (fs.existsSync(metaFilename)) {
    metadata = readMeta(metaFilename);
  } else {
    // no metafile means non-external JS
    return;
  }

  return metadata?.title ?? getOutputForSourceFile(absFilename).outputTiddler;
}

const writePluginInfo = pkg => {

  const pluginName = removePluginPrefix(getPackageNameFromPackageImport(pkg.name));
  const outputDir = getAbsolutePluginOutputPath(pluginName);

  const title = pluginTiddlerTitle(pluginName,'');

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
      const {outputTiddler}  = getOutputForSourceFile(absoluteFilename, STATIC_DIR);
      metadata.title = stripMetaSuffix(outputTiddler);
    }
    return stringifyMeta(metadata);
  }
  return content;
};



module.exports = {
  findPluginSources,
  getBanner,
  getJSBasename,
  getPackageNameFromAbsolutePath,
  getPackageNameFromPackageImport,
  getExternalImportPath,
  getAbsolutePluginOutputPath,
  getStaticSourceDir,
  getStaticTargetDir,
  PROJECT_ROOT,
  transformMetaAddTitle,
  writePluginInfo,
  TW5_SHADOW_TIDDLER_PREFIX,
  getOutputForSourceFile,
  OUTPUT_ROOT,
  removePluginPrefix,
  getFilenameForImport,
  isAbsolutePath,
  isRelativePath,
  isTiddlybaseImport,
  DIST_ROOT
 }
