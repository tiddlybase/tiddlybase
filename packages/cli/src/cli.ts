import yargs from 'yargs';
import { getuser, listusers, adduser, setCollectionRole, getCollectionRoles } from './users';
import { cmdGenerateFirebaseJson, cmdGenerateStorageRules, cmdGenerateFirestoreRules, cmdGenerateOuterHTML, cmdGenerateTiddlybaseConfigJson } from './generate';
import { buildwiki } from './wikibuilder';
import {runTWCommand} from './run-tw-command'

const main = async (argv:string[]) => {
  const output = await yargs(argv)
  .strict()
  .usage('Usage: $0 [global options] <command> [command options]')
  .alias('c', 'config')
  .nargs('c', 1)
  .describe('c', 'location of tiddlybase-config.json')
  .default('c', 'tiddlybase-config.json')
  .alias('k', 'service-account-key')
  .nargs('k', 1)
  .describe('k', 'path to service account key JSON')
  .default('k', 'etc/service-account-key.json')
  .command(setCollectionRole)
  .command(getCollectionRoles)
  .command(getuser)
  .command(listusers)
  .command(adduser)
  .command(cmdGenerateFirebaseJson)
  .command(cmdGenerateStorageRules)
  .command(cmdGenerateFirestoreRules)
  .command(cmdGenerateOuterHTML)
  .command(cmdGenerateTiddlybaseConfigJson)
  .command(buildwiki)
  .command(runTWCommand)
  //.command(importTiddlers)
  // .example('$0 setrole foo@bar.com admin', 'grant admin role to foo@bar.com on default wiki')
  //.example('$0 -w another-wiki getrole foo@bar.com', 'get role assigned to foo@bar.com on another-wiki')
  .help()
  .wrap(80)
  .alias('h', 'help')
  .epilog('Find more help at https://tiddlybase.com/')
  .demandCommand().argv;
  return output;
}

if (require.main === module) {
  main(process.argv.slice(2));
}
