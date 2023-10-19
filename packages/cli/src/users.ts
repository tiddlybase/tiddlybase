import { InstanceSpec, PERMISSIONED_DATA_STORAGE, PermissionedStorage } from '@tiddlybase/shared/src/instance-spec-schema';
import { objFilter } from '@tiddlybase/shared/src/obj-utils';
import { makeInstanceUserPermissionsUpdate, instanceSpecPath, makeInstanceUnauthenticatedPermissionsUpdate } from '@tiddlybase/shared/src/permissions';
import { TiddlyBaseUser, USER_ROLES } from '@tiddlybase/shared/src/users';
import * as crypto from "crypto";
import * as admin from 'firebase-admin';
import { UserRecord } from 'firebase-admin/lib/auth/user-record';
import { inspect } from 'util';
import { Argv, CommandModule } from 'yargs';
import { CLIContext, withCLIContext } from './cli-context';
import {default as merge} from 'lodash.merge';
import { LaunchParameters } from 'packages/shared/src/tiddlybase-config-schema';
import { DEFAULT_LAUNCH_PARAMETERS } from '@tiddlybase/shared/src/constants';
import { render } from 'mustache';

const RE_UID = /^[a-zA-Z0-9]+$/;
const ROLE_CHOICES = Object.keys(USER_ROLES).map(s => s.toLowerCase());

// doSetRole(cliContext.app, user.uid, config.instanceName, cliContext.args.collection, roleNumber);
const doSetUserCollectionRole = async (
  app: admin.app.App,
  launchParameters:LaunchParameters,
  resourceType: PermissionedStorage,
  collectionName: string,
  roleNumber: number): Promise<InstanceSpec> => {
  const docPath = instanceSpecPath(launchParameters.instance);
  const firestore = app.firestore();
  const instanceSpec = (await firestore.doc(docPath).get()).data()?.tiddler ?? {};
  merge(instanceSpec, makeInstanceUserPermissionsUpdate(resourceType, launchParameters.userId!, encodeURIComponent(collectionName), roleNumber));
  await firestore.doc(docPath).set({
    tiddler: {
      ...instanceSpec,
      modified: admin.firestore.FieldValue.serverTimestamp(),
      created: instanceSpec.created ?? admin.firestore.FieldValue.serverTimestamp(),
      title: instanceSpec.title ?? `instances/${launchParameters.instance}`
    }
  });
  return instanceSpec;
}

const doSetUnauthenticatedCollectionRole = async (
  app: admin.app.App,
  resourceType: PermissionedStorage,
  instance: string,
  collectionName: string,
  roleNumber: number): Promise<InstanceSpec> => {
  const docPath = instanceSpecPath(instance);
  const firestore = app.firestore();
  const instanceSpec = (await firestore.doc(docPath).get()).data()?.tiddler ?? {};
  merge(instanceSpec, makeInstanceUnauthenticatedPermissionsUpdate(resourceType, encodeURIComponent(collectionName), roleNumber));
  await firestore.doc(docPath).set({
    tiddler: {
      ...instanceSpec,
      modified: admin.firestore.FieldValue.serverTimestamp(),
      created: instanceSpec.created ?? admin.firestore.FieldValue.serverTimestamp(),
      title: instanceSpec.title ?? `instances/${instance}`
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

const UNAUTHENTICATED = "unauthenticated"

// TODO: migrate this to firestore-based ACL instead of custom JWT claims
export const setCollectionRole: CommandModule = {
  command: 'setcollectionrole instance <userid|email> collection role',
  describe: 'set a custom claim on a user',
  builder: (argv: Argv) =>
    argv
      .options({
        t: { type: 'string', alias: 'resource-type', describe: 'Resource type (collections or files)', default: PERMISSIONED_DATA_STORAGE[0], choices: PERMISSIONED_DATA_STORAGE }
      })
      .positional('instance', {
        describe: 'Instance name',
        type: 'string',
      })
      .positional('userid', {
        describe: 'User id or email address or "unauthenticated"',
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
    const roleName = (cliContext.args.role as string).toUpperCase();
    const roleNumber = USER_ROLES[roleName];
    if (!(roleName in USER_ROLES) || !(typeof roleNumber === 'number')) {
      throw new Error('Unknown role ' + cliContext.args.role);
    }
    const resourceType = cliContext.args['resource-type'] as PermissionedStorage;
    const userArg = cliContext.args.userid as string;
    const instance = cliContext.args.instance as string;
    const collectionArg = cliContext.args.collection as string;
    if (userArg === UNAUTHENTICATED) {
      const instanceSpec = await doSetUnauthenticatedCollectionRole(
        cliContext.app,
        resourceType,
        instance,
        collectionArg,
        roleNumber);
      console.log(JSON.stringify(instanceSpec, null, 4));
    } else {
      const user = await getUser(cliContext.app, userArg);
      const launchParameters:LaunchParameters = {
        ...DEFAULT_LAUNCH_PARAMETERS,
        userId: user.uid,
        instance
      }
      const collectionName = render(collectionArg, launchParameters);
      const instanceSpec = await doSetUserCollectionRole(
        cliContext.app,
        launchParameters,
        resourceType,
        collectionName,
        roleNumber);
      console.log(JSON.stringify(instanceSpec, null, 4));
    }
  }),
};

const removeUndefined = (obj: Record<string, any>): Record<string, any> => objFilter((_k, v) => v !== undefined, (obj as any))

const convertUser = (firebaseUser: UserRecord): TiddlyBaseUser => ({
  emailVerified: firebaseUser.emailVerified,
  displayName: firebaseUser.displayName || firebaseUser.email || firebaseUser.phoneNumber || undefined,
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
    await writeUserProfileToFirestore(cliContext.app, convertUser(user));
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
