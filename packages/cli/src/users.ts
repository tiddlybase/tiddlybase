import * as admin from 'firebase-admin';
import { Arguments, Argv, CommandModule } from 'yargs';
import {inspect} from 'util';

const RE_UID = /^[a-zA-Z0-9]+$/;

export const getUser = async (app: admin.app.App, uidOrEmail: string): Promise<admin.auth.UserRecord> => {
  let firebaseUser;
  if (uidOrEmail.match(RE_UID)) {
    firebaseUser = await app.auth().getUser(uidOrEmail);
  } else {
    firebaseUser = await app.auth().getUserByEmail(uidOrEmail);
  }
  return firebaseUser;
};

export const getCommandModules = (app: admin.app.App): Record<string, CommandModule> => {
  return {
    setclaim: {
      command: 'setclaim <userid|email> key value',
      describe: 'set a custom claim on a user',
      builder: (argv: Argv) =>
        argv
          .positional('userid', {
            describe: 'User id or email address',
            type: 'string',
          })
          .positional('key', {
            describe: 'Claim key',
            type: 'string',
          })
          .positional('value', {
            describe: 'Claim value',
            type: 'string',
          }),
      handler: async (args: Arguments) => {
        const user = await getUser(app, args.userid as string);
        const claims = {...user.customClaims};
        Object.assign(claims, {[args.key as string]: args.value as string})
        await app.auth().setCustomUserClaims(user.uid, claims);
        console.log(inspect(claims));
      },
    },
    setclaimjson: {
      command: 'setclaimjson <userid|email> json',
      describe: 'set all custom claims on a user',
      builder: (argv: Argv) =>
        argv
          .positional('userid', {
            describe: 'User id or email address',
            type: 'string',
          })
          .positional('json', {
            describe: 'Claim key',
            type: 'string',
          }),
      handler: async (args: Arguments) => {
        const user = await getUser(app, args.userid as string);
        const claims = JSON.parse(args.json as string);
        await app.auth().setCustomUserClaims(user.uid, claims);
        console.log(inspect(claims));
      },
    },
    getuser: {
      command: 'getuser <userid|email>',
      describe: 'prints information about user',
      builder: (argv: Argv) => {
        return argv.positional('userid', {
          describe: 'User id or email address',
          type: 'string',
        });
      },
      handler: async (args: Arguments) => {
        console.log(inspect(await getUser(app, args.userid as string)));
      }
    },
    getclaims: {
      command: 'getclaims <userid|email>',
      describe: 'gets the assigned role for a user',
      builder: (argv: Argv) => {
        return argv.positional('userid', {
          describe: 'User id or email address',
          type: 'string',
        });
      },
      handler: async (args: Arguments) => {
        const user = await getUser(app, args.userid as string);
        console.log(inspect(user.customClaims));
      },
    },
  };
};
