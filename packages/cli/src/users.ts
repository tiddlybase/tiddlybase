import { InstanceSpec, PERMISSIONED_DATA_SOURCES, PermissionedDataSource, UserId } from '@tiddlybase/shared/src/instance-spec-schema';
import { objFilter } from '@tiddlybase/shared/src/obj-filter';
import { addInstancePermissions, instanceSpecPath } from '@tiddlybase/shared/src/permissions';
import { TiddlyBaseUser, USER_ROLES, substituteUserid } from '@tiddlybase/shared/src/users';
import * as crypto from "crypto";
import * as admin from 'firebase-admin';
import { UserRecord } from 'firebase-admin/lib/auth/user-record';
import { inspect } from 'util';
import { Argv, CommandModule } from 'yargs';
import { CLIContext, withCLIContext } from './cli-context';
import { requireSingleConfig } from './config';

const RE_UID = /^[a-zA-Z0-9]+$/;
const ROLE_CHOICES = Object.keys(USER_ROLES).map(s => s.toLowerCase());

// doSetRole(cliContext.app, user.uid, config.instanceName, cliContext.args.collection, roleNumber);
const doSetRole = async (app: admin.app.App, userId: UserId, instanceName: string, resourceType: PermissionedDataSource, collectionName: string, roleNumber: number): Promise<InstanceSpec> => {
  const docPath = instanceSpecPath(instanceName);
  const firestore = app.firestore();
  const instanceSpec = (await firestore.doc(docPath).get()).data()?.tiddler ?? {};
  addInstancePermissions(instanceSpec, resourceType, userId, collectionName, roleNumber);
  await firestore.doc(docPath).set({
    tiddler: {
      ...instanceSpec,
      modified: admin.firestore.FieldValue.serverTimestamp(),
      created: instanceSpec.created ?? admin.firestore.FieldValue.serverTimestamp(),
      title: instanceSpec.title ?? `instances/${instanceName}`
    }
  });
  return instanceSpec;
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

export const userRecordToJSON = (userRecord: admin.auth.UserRecord): any => {
  const result = userRecord.toJSON() as any;
  result.metadata = {
    "lastSignInTime": new Date(userRecord.metadata.lastSignInTime).toISOString(),
    "creationTime": new Date(userRecord.metadata.creationTime).toISOString(),
    "lastRefreshTime": userRecord.metadata.lastRefreshTime ? new Date(userRecord.metadata.lastRefreshTime).toISOString() : undefined
  }
  return result;
}

// TODO: migrate this to firestore-based ACL instead of custom JWT claims
export const getCollectionRoles: CommandModule = {
  command: 'getcollectionroles instance',
  describe: 'set a custom claim on a user',
  builder: (argv: Argv) =>
    argv
      .positional('instance', {
        describe: 'Name of instance',
        type: 'string',
      }),
  handler: withCLIContext(async (cliContext: CLIContext) => {
    const docPath = instanceSpecPath(cliContext.args.instance as string);
    const firestore = cliContext.app.firestore();
    const instanceSpec = (await firestore.doc(docPath).get()).data()?.tiddler ?? {};
    console.log(JSON.stringify(instanceSpec, null, 4));
  }),
};

// TODO: migrate this to firestore-based ACL instead of custom JWT claims
export const setCollectionRole: CommandModule = {
  command: 'setcollectionrole <userid|email> collection role',
  describe: 'set a custom claim on a user',
  builder: (argv: Argv) =>
    argv
      .options({
        t: { type: 'string', alias: 'resource-type', describe: 'Resource type (collections or files)', default: PERMISSIONED_DATA_SOURCES[0], choices: PERMISSIONED_DATA_SOURCES }
      })
      .positional('userid', {
        describe: 'User id or email address',
        type: 'string',
      })
      .positional('collection', {
        describe: 'Collection name',
        type: 'string',
      })
      .positional('role', {
        describe: 'Role name',
        choices: ROLE_CHOICES
      }),
  handler: withCLIContext(async (cliContext: CLIContext) => {
    const user = await getUser(cliContext.app, cliContext.args.userid as string);
    const roleName = (cliContext.args.role as string).toUpperCase();
    const roleNumber = USER_ROLES[roleName];
    if (!(roleName in USER_ROLES) || !(typeof roleNumber === 'number')) {
      throw new Error('Unknown role ' + cliContext.args.role);
    }
    const { config } = requireSingleConfig(cliContext.args);
    const resourceType = cliContext.args['resource-type'] as PermissionedDataSource;
    const instanceSpec = await doSetRole(cliContext.app, user.uid, config.instanceName, resourceType, encodeURIComponent(substituteUserid(cliContext.args.collection as string, user.uid)), roleNumber);
    console.log(JSON.stringify(instanceSpec, null, 4));
  }),
};

const removeUndefined = (obj: Record<string, any>): Record<string, any> => objFilter((_k, v) => v !== undefined, (obj as any))

const convertUser = (firebaseUser: UserRecord): TiddlyBaseUser => ({
  emailVerified: firebaseUser.emailVerified,
  displayName: firebaseUser.displayName || undefined,
  photoURL: firebaseUser.photoURL || undefined,
  providerId: firebaseUser.providerData[0].providerId,
  userId: firebaseUser.uid
});

const writeUserProfileToFirestore = async (app: admin.app.App, userProfile: TiddlyBaseUser): Promise<void> => {
  const docPath = `/tiddlybase-instances/admin/collections/users/tiddlers/${userProfile.userId}`;
  const firestore = app.firestore();
  const existingProfile = (await firestore.doc(docPath).get()).data()?.tiddler ?? {};
  await firestore.doc(docPath).set({
    tiddler: removeUndefined({
      ...existingProfile,
      ...userProfile,
      modified: admin.firestore.FieldValue.serverTimestamp(),
      created: existingProfile.created ?? admin.firestore.FieldValue.serverTimestamp(),
      title: existingProfile.title ?? `users/${userProfile.userId}`
    })
  });
}

export const adduser: CommandModule = {
  command: 'adduser email',
  describe: 'add a new user',
  builder: (argv: Argv) =>
    argv
      .positional('email', {
        describe: 'Email address of new user',
        type: 'string',
      }),
  handler: withCLIContext(async (cliContext: CLIContext) => {
    const user = await cliContext.app.auth().createUser({
      email: cliContext.args.email as string,
      password: crypto.randomBytes(20).toString('hex'),
    })
    console.log(inspect(user));
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
  handler: withCLIContext(async (cliContext: CLIContext) => {
    console.log(
      JSON.stringify(
        userRecordToJSON(
          await getUser(cliContext.app, cliContext.args.userid as string)),
        null,
        4));
  })
};

export const updateUserProfile: CommandModule = {
  command: 'updateuserprofile <userid|email>',
  describe: 'Update user profile in Firestore',
  builder: (argv: Argv) => {
    return argv.positional('userid', {
      describe: 'User id or email address',
      type: 'string',
    });
  },
  handler: withCLIContext(async (cliContext: CLIContext) => {

    const user = await getUser(cliContext.app, cliContext.args.userid as string);
    await writeUserProfileToFirestore(cliContext.app, convertUser(user));

  })
};

export const listusers: CommandModule = {
  command: 'listusers',
  describe: 'list all users of the system',
  builder: (argv: Argv) => argv,
  handler: withCLIContext(async (cliContext: CLIContext) => {
    console.log(
      JSON.stringify(
        (await cliContext.app.auth().listUsers()).users.map(userRecordToJSON),
        null,
        4));
  })
};
