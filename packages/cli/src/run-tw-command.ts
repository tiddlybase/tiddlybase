import { Arguments, Argv, CommandModule } from "yargs";
import { getPluginPaths, getWikiInfoFilename, invokeTiddlyWiki, TIDDLYWIKI_CLI_OPTIONS } from "./tw-utils";

export const runTWCommand: CommandModule = {
  command: 'tw-command <wikidir>',
  describe: 'run a tiddlywiki command',
  builder: (argv: Argv) => argv.options(
    TIDDLYWIKI_CLI_OPTIONS
  ),
  handler: async (args: Arguments) => {
    const pluginPaths = getPluginPaths(args);
    const wikiInfoFilename = getWikiInfoFilename(args);
    const wikidir = args.wikidir as string;
    const twargs = (args["_"] as string[]).slice(1);
    console.log(`executing tiddlywiki with args "${twargs}" wiki info filename: ${wikiInfoFilename ?? "(null)"}`);
    await invokeTiddlyWiki(
      wikidir,
      pluginPaths,
      twargs,
      [],
      wikiInfoFilename);
  },
};
