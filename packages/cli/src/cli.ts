// import 'source-map-support/register';
import * as admin from 'firebase-admin';
import yargs from 'yargs';
import { getCommandModules as getUsersModules } from './users';
// import { getCommandModules as getImportModules } from './import';

const app = admin.initializeApp();

const { getclaims, setclaim, setclaimjson, getuser } = getUsersModules(app);
//const { importTiddlers } = getImportModules(app);

const main = async (argv:string[]) => {
  const output = await yargs(argv)
  .strict()
  .usage('Usage: $0 <command> [options]')
  .command(getclaims)
  .command(setclaim)
  .command(setclaimjson)
  .command(getuser)
  //.command(importTiddlers)
  .example('$0 setrole foo@bar.com admin', 'grant admin role to foo@bar.com on default wiki')
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
