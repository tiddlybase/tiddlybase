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

export const getPluginPaths = (args:Arguments) => typeof (args['plugin-path']) === 'string' ? [args['plugin-path'] as string] : args['plugin-path'] as string[]

export const getWikiInfoFilename = (args:Arguments):string|undefined => args['wiki-info-filename'] as string|undefined;

export const invokeTiddlyWiki = (
  wikiDir: string,
  pluginPaths?: string[],
  args: string[] = [],
  preloadedTiddlers: $tw.TiddlerFields[] = [],
  wikiInfoFilename?: string
): Promise<typeof $tw> => {
  let fixedPluginPaths = [...pluginPaths ?? []];
  const $twInstance = TiddlyWiki(bootprefix());
  // this is a terrible hack!
  if (wikiInfoFilename) {
    // change working dir to be same as tiddlywiki.info
    // since tiddlywiki assumes that to be the case
    const wikiInfoDir = dirname(wikiInfoFilename);
    process.chdir(wikiInfoDir)
    const newWikiInfoFilename = relative(wikiInfoDir, wikiInfoFilename);
    fixedPluginPaths = fixedPluginPaths.map(p => relative(wikiInfoDir, p));
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
        return invocationCount < 5 ? newWikiInfoFilename  : "./tiddlywiki.info";
      }
    } as typeof $tw.config
  }
  // setting the env var is the only way to include multiple plugin dirs, which is very useful
  // if a tiddlybase instance has it's own plugins, but the builds also need standard tiddlybase plugins
  process.env['TIDDLYWIKI_PLUGIN_PATH'] = fixedPluginPaths.join(delimiter)
  $twInstance.boot.argv = [
    wikiDir,
    "--verbose"].concat(args)
  $twInstance.preloadTiddlerArray(preloadedTiddlers);
  return new Promise((resolve) => $twInstance.boot.boot(() => resolve($twInstance)));
}
