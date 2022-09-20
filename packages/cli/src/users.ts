import * as admin from 'firebase-admin';
import { Argv, CommandModule } from 'yargs';
import { inspect } from 'util';
import { USER_ROLES } from '@tiddlybase/shared/src/user-roles'
import { requireSingleConfig } from './config';
import { getJWTRoleClaim } from '@tiddlybase/shared/src/tiddlybase-config-schema';
import { CLIContext, withCLIContext } from './cli-context';
import * as crypto from "crypto";
import { Auth } from 'firebase-admin/lib/auth/auth';
import { UserRecord } from 'firebase-admin/lib/auth/user-record';

const RE_UID = /^[a-zA-Z0-9]+$/;
const ROLE_CHOICES = Object.keys(USER_ROLES).map(s => s.toLowerCase());

const doSetRole = async (auth: Auth, user:UserRecord, jwtRoleClaim:string, roleName:string):Promise<Record<string, any>> => {
  const roleNumber = USER_ROLES[roleName];
  const claims = {
    ...user.customClaims,
    [jwtRoleClaim]: roleNumber
  };
  await auth.setCustomUserClaims(user.uid, claims);
  return claims;
}

export const getUser = async (app: admin.app.App, uidOrEmail: string): Promise<admin.auth.UserRecord> => {
  let firebaseUser;
  if (uidOrEmail.match(RE_UID)) {
    firebaseUser = await app.auth().getUser(uidOrEmail);
  } else {
    firebaseUser = await app.auth().getUserByEmail(uidOrEmail);
  }
  return firebaseUser;
};

export const setrole: CommandModule = {
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
        choices: ROLE_CHOICES
      }),
  handler: withCLIContext(async (cliContext:CLIContext) => {
    const user = await getUser(cliContext.app, cliContext.args.userid as string);
    const roleName = (cliContext.args.role as string).toUpperCase();
    if (!(roleName in USER_ROLES)) {
      throw new Error('Unknown role ' + cliContext.args.role);
    }
    const config = requireSingleConfig(cliContext.args);
    const claims = await doSetRole(cliContext.app.auth(), user, getJWTRoleClaim(config), roleName);
    console.log(inspect(claims));
  }),
};

export const adduser: CommandModule = {
  command: 'adduser email [role]',
  describe: 'add a new user',
  builder: (argv: Argv) =>
    argv
      .positional('email', {
        describe: 'Email address of new user',
        type: 'string',
      })
      .positional('role', {
        describe: 'role name',
        choices: ROLE_CHOICES
      }),
  handler: withCLIContext(async (cliContext:CLIContext) => {
    const user = await cliContext.app.auth().createUser({
      email: cliContext.args.email as string,
      password: crypto.randomBytes(20).toString('hex'),
    })
    const roleName = (cliContext.args.role as string).toUpperCase();
    if (!(roleName in USER_ROLES)) {
      throw new Error('Unknown role ' + cliContext.args.role);
    }
    const config = requireSingleConfig(cliContext.args);
    const claims = await doSetRole(cliContext.app.auth(), user, getJWTRoleClaim(config), roleName);
    console.log(inspect(claims));
  }),
};

export const setclaimjson: CommandModule = {
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
  handler: withCLIContext(async (cliContext:CLIContext) => {
    const user = await getUser(cliContext.app, cliContext.args.userid as string);
    const claims = JSON.parse(cliContext.args.json as string);
    await cliContext.app.auth().setCustomUserClaims(user.uid, claims);
    console.log(inspect(claims));
  }),
};

export const getuser: CommandModule = {
  command: 'getuser <userid|email>',
  describe: 'prints information about user',
  builder: (argv: Argv) => {
    return argv.positional('userid', {
      describe: 'User id or email address',
      type: 'string',
    });
  },
  handler: withCLIContext(async (cliContext:CLIContext) => {
    console.log(inspect(await getUser(cliContext.app, cliContext.args.userid as string)));
  })
};
export const getclaims: CommandModule = {
  command: 'getclaims <userid|email>',
  describe: 'gets the assigned role for a user',
  builder: (argv: Argv) => {
    return argv.positional('userid', {
      describe: 'User id or email address',
      type: 'string',
    });
  },
  handler: withCLIContext(async (cliContext:CLIContext) => {
    const user = await getUser(cliContext.app, cliContext.args.userid as string);
    console.log(inspect(user.customClaims));
  }),
};
