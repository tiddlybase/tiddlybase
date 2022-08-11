// import 'source-map-support/register';
import * as admin from 'firebase-admin';
import yargs from 'yargs';
import { getCommandModules as getUsersModules } from './users';
import { getCommandModules as getGenerateModules } from './generate';
// import { getCommandModules as getImportModules } from './import';

const app = admin.initializeApp();

const { getclaims, setclaim, setclaimjson, getuser } = getUsersModules(app);
const generateCommands = getGenerateModules(app);

const main = async (argv:string[]) => {
  const output = await yargs(argv)
  .strict()
  .usage('Usage: $0 [global options] <command> [command options]')
  .alias('c', 'config')
  .nargs('c', 1)
  .describe('c', 'location of tiddlybase-config.json')
  .default('c', 'tiddlybase-config.json')
  .command(getclaims)
  .command(setclaim)
  .command(setclaimjson)
  .command(getuser)
  .command(generateCommands['generate:storage.rules'])
  .command(generateCommands['generate:firebase.json'])
  //.command(importTiddlers)
  //.example('$0 setrole foo@bar.com admin', 'grant admin role to foo@bar.com on default wiki')
  //.example('$0 -w another-wiki getrole foo@bar.com', 'get role assigned to foo@bar.com on another-wiki')
  .help()
  .wrap(80)
  .alias('h', 'help')
  .epilog('Find more help at: https://neumark.github.io/tw5-firebase/')
  .demandCommand().argv;
  await admin.app().delete();
  return output;
}

main(process.argv.slice(2));
