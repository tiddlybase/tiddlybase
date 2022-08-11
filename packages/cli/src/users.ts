import * as admin from 'firebase-admin';
import { Arguments, Argv, CommandModule } from 'yargs';
import {inspect} from 'util';
import {USER_ROLES} from '@tiddlybase/shared/src/user-roles'
import { requireSingleConfig } from './config';
import { getJWTRoleClaim } from 'packages/shared/src/tiddlybase-config-schema';

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
    setrole: {
      command: 'setrole <userid|email> role',
      describe: 'set a custom claim on a user',
      builder: (argv: Argv) =>
        argv
          .positional('userid', {
            describe: 'User id or email address',
            type: 'string',
          })
          .positional('role', {
            describe: 'role name',
            type: 'string',
          }),
      handler: async (args: Arguments) => {
        const user = await getUser(app, args.userid as string);
        const roleName = (args.role as string).toUpperCase();
        if (!(roleName in USER_ROLES)) {
          throw new Error('Unknown role '+args.role);
        }
        const roleNumber = USER_ROLES[roleName];
        const config = requireSingleConfig(args);
        const claims = {
          ...user.customClaims,
          [getJWTRoleClaim(config)]: roleNumber
        };
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
