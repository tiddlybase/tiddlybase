/// <reference types="@tiddlybase/tw5-types/src/index" />
/// <reference types="@tiddlybase/tw5-types/src/tiddlywiki-node" />
import { bootprefix } from 'tiddlywiki/boot/bootprefix';
import { TiddlyWiki } from 'tiddlywiki';
import { Arguments, Argv, CommandModule } from 'yargs';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join, basename, dirname, sep, resolve, delimiter } from 'path';
import { tmpdir } from 'os';
import { rawReadJSON } from './config';
import { joinPaths } from '@tiddlybase/shared/src/join-paths';

type OutputType = 'html' | 'json';

const DEFAULT_OUTPUT_FILENAME: Record<OutputType, string> = {
  'json': './wiki.json',
  'html': './wiki.html'
}
const FILENAME_TIDDLYWIKI_INFO = "tiddlywiki.info";

const JSON_BUILDER_FILTER = [
  // Export tiddlers
  "[is[tiddler]]",
  // Except those with the following prefixes
  "-[prefix[$:/state/popup/]]",
  "-[prefix[$:/status]]",
  "-[prefix[$:/temp/]]",
  "-[prefix[$:/tiddlybase/wikibuilder/]]",
  // Except drafts
  "-[has[draft.of]]",
  // Except pending imports
  "-[status[pending]plugin-type[import]]",
  // Except these tiddlers which should come from the user's session
  "-[[$:/HistoryList]]",
  "-[[$:/StoryList]]",
  // Except the following built-in tiddlers
  "-[[$:/boot/boot.css]]",
  "-[[$:/library/sjcl.js]]",
  "-[[$:/boot/boot.js]]",
  "-[[$:/boot/bootprefix.js]]",
  "-[[$:/core]]",
  "-[[$:/isEncrypted]]",
  // sort them all by title
  "+[sort[title]]",
].join(" ");

const SAVE_WIKI_INFO_TIDDLER: $tw.TiddlerFields = {
title: "$:/tiddlybase/wikibuilder/save-wiki-json.js",
type: "application/javascript",
"module-type": "startup",
text: `
(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict';

  // Export name and synchronous status
  exports.name = 'save-wiki-json';
  exports.after = ['load-modules'];
  exports.synchronous = true;
  exports.platforms = ['node'];

  const objMap = (fn, input) => Object.fromEntries(Object.entries(input).map(fn));

  exports.startup = function () {
    if ($tw?.boot?.wikiInfo?.config) {
      $tw.wiki.addTiddler(
        new $tw.Tiddler({
          ...(objMap(
              ([k, v]) => [k, JSON.stringify(v)],
              $tw.boot.wikiInfo.config ?? {})),
          title: '$:/config/wikiInfoConfig',
          }),
      );
    }
  };

})();`
}

const SAVE_JSON_COMMAND_TIDDLER: $tw.TiddlerFields = {

  title: '$:/tiddlybase/wikibuilder/savejson.js',
  type: 'application/javascript',
  'module-type': 'command',
  text: `
(function(){

  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  exports.info = {
    name: "savejson",
    synchronous: true
  };

  var Command = function(params,commander,callback) {
    this.params = params;
    this.commander = commander;
    this.callback = callback;
  };

  const filter = "${JSON_BUILDER_FILTER}";

  Command.prototype.execute = function() {
    if(this.params.length < 1) {
      return "Missing output filename";
    }
    var self = this,
      fs = require("fs"),
      path = require("path"),
      wiki = this.commander.wiki,
      filename = path.resolve(self.commander.outputPath, this.params[0]);
      if(self.commander.verbose) {
          console.log("Saving JSON tiddlers to " + filename);
      }
      $tw.utils.createFileDirectories(filename);
      fs.writeFileSync(filename, $tw.wiki.getTiddlersAsJson(filter), 'utf-8');
    return null;
  };

  exports.Command = Command;

  })();
  `
};

const readTiddlyWikiInfo = (wikiDir:string) => rawReadJSON(joinPaths(wikiDir, FILENAME_TIDDLYWIKI_INFO));

const getTiddlyWikiInfo = (inputWikiDirs: string[]): $tw.TiddlyWikiInfo => {
  return {
    "includeWikis": inputWikiDirs.map(path => ({ path: resolve(path), "read-only": true })),
    // configs are merged from all tiddlywiki.info files
    "config": Object.assign({}, ...(inputWikiDirs.map(d => readTiddlyWikiInfo(d)?.config ?? {}))),
    // TiddlyWiki automatically merges the plugins and themes of included
    // wikis (also, transitively included ones), no need explicitly set anything
    // in the top-level tiddlywiki.info file.
    "plugins": [],
    "themes": [],
    "build": {}
  };
}

const invokeTiddlyWiki = (wikiDir: string, outputType: OutputType, outputFilename: string, tiddlyWikiInfo?: $tw.TiddlyWikiInfo, pluginPaths?: string[]): Promise<typeof $tw> => {
  const $twInstance = TiddlyWiki(bootprefix());
  // setting the env var is the only way to include multiple plugin dirs, which is very useful
  // if a tiddlybase instance has it's own plugins, but the builds also need standard tiddlybase plugins
  process.env['TIDDLYWIKI_PLUGIN_PATH'] = (pluginPaths ?? []).join(delimiter)
  if (outputType === 'json') {
    $twInstance.boot.argv = [
      wikiDir,
      "--output", dirname(outputFilename),
      "--savejson", basename(outputFilename),
      "--verbose"]
    $twInstance.preloadTiddlerArray([SAVE_JSON_COMMAND_TIDDLER]);
  } else {
    $twInstance.boot.argv = [
      wikiDir,
      "--output", dirname(outputFilename),
      "--rendertiddler", "$:/core/save/all",
      basename(outputFilename),
      "text/plain",
      "--verbose"]
    $twInstance.preloadTiddlerArray([SAVE_WIKI_INFO_TIDDLER]);
  }

  return new Promise((resolve) => $twInstance.boot.boot(() => resolve($twInstance)));
}

const prepareTemporaryWikiDir = () => mkdtempSync(`${tmpdir()}${sep}tiddlybase-wikibuilder`);

export const buildwiki: CommandModule = {
  command: 'buildwiki <wikidir> [additional_wiki_dirs..]',
  describe: 'build a JSON wiki contents file',
  builder: (argv: Argv) =>
    argv
      .options({
        o: {
          type: 'string', alias: 'output', describe: 'filename of JSON output'
        },
        t: {
          type: 'string', alias: 'type', describe: 'type of output', default: 'json', choices: ['html', 'json']
        },
        p: {
          type: 'string', alias: 'plugin-path', describe: 'directory hosting plugins', default: './plugins'
        }
      })
      // TODO: allow multiple wiki dirs to be passed!
      .positional('wikidirs', {
        describe: 'wikidirs containing tiddlers',
        type: 'string'
      }),
  handler: async (args: Arguments) => {
    const pluginPaths = (typeof (args['plugin-path']) === 'string' ? [args['plugin-path'] as string] : args['plugin-path'] as string[]).map(p => resolve(p))
    const wikidirs = [args.wikidir as string].concat(args.additional_wiki_dirs as string[]);
    const outputType = args.t as OutputType;
    const outputFilename = (args.output as string | undefined) ?? DEFAULT_OUTPUT_FILENAME[outputType];
    const temporaryWikiDir = prepareTemporaryWikiDir();

    console.log(`using temp dir ${temporaryWikiDir} writing output to ${outputFilename} in format ${outputType}`);
    const tiddlyWikiInfo = getTiddlyWikiInfo(wikidirs);
    // write tiddlywiki.info
    writeFileSync(
      join(temporaryWikiDir, FILENAME_TIDDLYWIKI_INFO),
      JSON.stringify(tiddlyWikiInfo, null, 4),
      { encoding: 'utf-8' });
    // invoke tiddlywiki
    await invokeTiddlyWiki(temporaryWikiDir, outputType, outputFilename, tiddlyWikiInfo, pluginPaths);
    // delete temp dir
    rmSync(temporaryWikiDir, { recursive: true, force: true })
  },
};
