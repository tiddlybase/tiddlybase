/// <reference types="@tiddlybase/tw5-types/src/index" />
/// <reference types="@tiddlybase/tw5-types/src/tiddlywiki-node" />
import { TiddlybaseConfig } from 'packages/shared/src/tiddlybase-config-schema';
import { bootprefix } from 'tiddlywiki/boot/bootprefix';
import { TiddlyWiki } from 'tiddlywiki';
import { Arguments, Argv, CommandModule } from 'yargs';
import { requireSingleConfig } from './config';
import { readFileSync, mkdtempSync, writeFileSync } from 'fs';
import { join, basename, dirname, sep } from 'path';
import { tmpdir } from 'os';

const FILENAME_TIDDLYWIKI_INFO = "tiddlywiki.info";
const BUILDER_CONFIG_OVERRIDES: Partial<$tw.WikiInfoConfig> = {
  "retain-original-tiddler-path": false,
};
const JSON_BUILDER_FILTER = [
  "[is[tiddler]]",
  "-[prefix[$:/state/popup/]]",
  "-[prefix[$:/status]]",
  "-[prefix[$:/temp/]]",
  "-[prefix[$:/tiddlybase/wikibuilder/]]",
  "-[prefix[$:/HistoryList]]",
  "-[status[pending]plugin-type[import]]",
  "-[[$:/boot/boot.css]]",
  "-[type[application/javascript]library[yes]]",
  "-[[$:/boot/boot.js]]",
  "-[[$:/boot/bootprefix.js]]",
  "-[[$:/core]]",
  "-[[$:/isEncrypted]]",
  "+[sort[title]]",
].join(" ");

const SAVE_JSON_COMMAND_TIDDLER:$tw.TiddlerFields = {

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

const getTiddlyWikiInfo = (tiddlybaseConfig: TiddlybaseConfig, inputWikiDir: string): $tw.TiddlyWikiInfo => {
  const inputWikiInfo: $tw.TiddlyWikiInfo = JSON.parse(
    readFileSync(
      join(inputWikiDir, FILENAME_TIDDLYWIKI_INFO), { encoding: 'utf-8' }));
  return {
    "includeWikis": [
      { "path": inputWikiDir, "read-only": true }
    ],

    "config": Object.assign({}, inputWikiInfo?.config, BUILDER_CONFIG_OVERRIDES),
    "plugins": inputWikiInfo.plugins,
    "themes": inputWikiInfo.themes,
    "build": {}
  };
}

const invokeTiddlyWiki = (wikiDir:string, outputPath: string):Promise<typeof $tw> => {
  const $twInstance = TiddlyWiki(bootprefix());
  $twInstance.boot.argv = [
    wikiDir,
    '--output', dirname(outputPath),
    "--savejson", basename(outputPath),
    '--verbose']
  $twInstance.preloadTiddlerArray([SAVE_JSON_COMMAND_TIDDLER]);
  return new Promise((resolve) => $twInstance.boot.boot(() => resolve($twInstance)));
}

const prepareTemporaryWikiDir = () => mkdtempSync(`${tmpdir()}${sep}tiddlybase-wikibuilder`);

export const getCommandModules = (): Record<string, CommandModule> => {
  return {
    buildwikijson: {
      command: 'buildwikijson wikidir',
      describe: 'build a JSON wiki contents file',
      builder: (argv: Argv) =>
        argv
          .options({
            o: {
              type: 'string', alias: 'output', describe: 'filename of JSON output', default: './wiki.json'
            }
          })
          .positional('wikidir', {
            describe: 'wikidir containing tiddlers',
            type: 'string',
          }),
      handler: async (args: Arguments) => {
        const output = args.output as string
        const config = requireSingleConfig(args);
        const temporaryWikiDir = prepareTemporaryWikiDir();
        console.log(`using temp dir ${temporaryWikiDir} writing output to ${output}`);
        // write tiddlywiki.info
        writeFileSync(
          join(temporaryWikiDir, FILENAME_TIDDLYWIKI_INFO),
          JSON.stringify(getTiddlyWikiInfo(config, args.wikidir as string), null, 4),
          { encoding: 'utf-8' });
        // invoke tiddlywiki
        await invokeTiddlyWiki(temporaryWikiDir, output);
      },
    }
  };
};
