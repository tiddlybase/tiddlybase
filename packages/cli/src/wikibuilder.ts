/// <reference types="@tiddlybase/tw5-types/src/index" />
/// <reference types="@tiddlybase/tw5-types/src/tiddlywiki-node" />
import { Arguments, Argv, CommandModule } from 'yargs';
import { basename, dirname } from 'path';
import { getPluginPaths, getWikiDirRelativePath, getWikiInfoFilename, invokeTiddlyWiki, TIDDLYWIKI_CLI_OPTIONS } from './tw-utils';

type OutputType = 'html' | 'json';

const DEFAULT_OUTPUT_FILENAME: Record<OutputType, string> = {
  'json': './wiki.json',
  'html': './wiki.html'
}

const DEFAULT_JSON_BUILDER_FILTER = [
  // Export non-shadow tiddlers
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
  title: "$:/tiddlybase/wikibuilder/save-wiki-info.js",
  type: "application/javascript",
  "module-type": "startup",
  text: `
(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict';

  // Export name and synchronous status
  exports.name = 'save-wiki-info';
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

  let filter = "${DEFAULT_JSON_BUILDER_FILTER}";

  Command.prototype.execute = function() {
    if(this.params.length < 1) {
      return "Missing output filename";
    }
    if (this.params[1]) {
      console.log("using filter expression from tiddler " + this.params[1]);
      filter = this.commander.wiki.getTiddler(this.params[1]).fields.text;
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

export const buildwiki: CommandModule = {
  command: 'buildwiki [exportfilter]',
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
        ...TIDDLYWIKI_CLI_OPTIONS
      }),
  handler: async (args: Arguments) => {
    const wikiInfoFilename = getWikiInfoFilename(args);
    const pluginPaths = getPluginPaths(args, wikiInfoFilename);
    const outputType = args.t as OutputType;
    const outputFilename = getWikiDirRelativePath((args.output as string | undefined) ?? DEFAULT_OUTPUT_FILENAME[outputType], wikiInfoFilename);

    await invokeTiddlyWiki(
      pluginPaths,
      outputType === 'json' ? [
        "--output", dirname(outputFilename),
        "--savejson", basename(outputFilename), (args.exportfilter as string | undefined) ?? ""
      ] : [
        "--output", dirname(outputFilename),
        "--render", (args.exportfilter as string | undefined) ?? "$:/core/save/all", basename(outputFilename),
        "text/plain"
      ],
      outputType === 'json' ? [SAVE_JSON_COMMAND_TIDDLER] : [SAVE_WIKI_INFO_TIDDLER],
      wikiInfoFilename
    );
  },
};
