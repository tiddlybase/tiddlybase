/// <reference types="@tiddlybase/tw5-types/src/index" />
/// <reference types="@tiddlybase/tw5-types/src/tiddlywiki-node" />
import { bootprefix } from 'tiddlywiki/boot/bootprefix';
import { TiddlyWiki } from 'tiddlywiki';
import { delimiter, dirname, relative } from 'path';
import { Arguments, Options } from 'yargs';

export const TIDDLYWIKI_CLI_OPTIONS:Record<string, Options> = {
  p: {
    type: 'string', alias: 'plugin-path', describe: 'directory hosting plugins', default: './plugins'
  },
  "wiki-info-filename": {
    type: 'string', describe: 'use alternate file instead of tiddlywiki.info', default: undefined
  }
};

export const DEFAULT_TIDDLYWIKI_INFO_PATH = "./tiddlywiki.info";

export const getPluginPaths = (args:Arguments, wikiInfoFilename:string) => {
  const pathList = typeof (args['plugin-path']) === 'string' ? [args['plugin-path'] as string] : args['plugin-path'] as string[]
  return pathList.map(p => getWikiDirRelativePath(p, wikiInfoFilename));
}

export const getWikiInfoFilename = (args:Arguments):string => (args['wiki-info-filename'] as string|undefined) ?? DEFAULT_TIDDLYWIKI_INFO_PATH;

export const getWikiDirRelativePath = (filePath: string, wikiInfoFilename?: string):string => {
  if (wikiInfoFilename) {
    // change working dir to be same as tiddlywiki.info
    // since tiddlywiki assumes that to be the case
    const wikiInfoDir = dirname(wikiInfoFilename);
    return relative(wikiInfoDir, filePath);
  }
  return filePath;
}

// this is a collection of terrible hacks due to a couple of tiddlywiki
// assumptions:
// - The tiddlywiki.info file is always called this. In tiddlybase, there may be
//   multiple tiddlywiki.info files with different names (for example, to load
//   the tiddlyweb plugin in one for local editing, but not another).
// - That all paths in tiddlywiki.info, such as included wikis are relative to
//   the current directory. This breaks if tiddlywiki is not running in the same
//   dir as the tiddlywiki.info file.
export const invokeTiddlyWiki = (
  pluginPaths: string[],
  args: string[],
  preloadedTiddlers: $tw.TiddlerFields[],
  wikiInfoFilename: string
): Promise<typeof $tw> => {
  const $twInstance = TiddlyWiki(bootprefix());
  const wikiDir = dirname(wikiInfoFilename);
  // Change node process's CWD to wiki dir, since tiddlywiki assumes this to be true
  console.log("Changing working dir to " + wikiDir);
  process.chdir(wikiDir)
  // update path of wiki info file to match new current directory.
  const newWikiInfoFilename = getWikiDirRelativePath(wikiInfoFilename, wikiInfoFilename);

  // this is a horrible hack:
  let invocationCount = 0;
  $twInstance.config = {
    get wikiInfo() {
      invocationCount+=1;
      //console.log("wikiInfo invocation count", invocationCount)
      //console.trace();
      // $tw.config.wikiInfo is accessed 3 times in $tw.boot.initStartup due
      // to the deepDefaults() call, and then once for each included wiki
      // plus the top-level wiki itself. We only want to return the custom
      // wiki info filename for the top-level wiki (the first 3 accesses
      // during initStartup() don't actually matter).
      return invocationCount < 5 ? newWikiInfoFilename  : DEFAULT_TIDDLYWIKI_INFO_PATH;
    }
  } as typeof $tw.config

  // setting the env var is the only way to include multiple plugin dirs, which is very useful
  // if a tiddlybase instance has it's own plugins, but the builds also need standard tiddlybase plugins
  process.env['TIDDLYWIKI_PLUGIN_PATH'] = pluginPaths.join(delimiter)
  $twInstance.boot.argv = [
    '.',
    "--verbose"].concat(args)
  $twInstance.preloadTiddlerArray(preloadedTiddlers);
  return new Promise((resolve, reject) => {
    try {
      $twInstance.boot.boot(() => resolve($twInstance));
    } catch (e) {
      console.error(e);
      reject(e);
    }
  });
}
