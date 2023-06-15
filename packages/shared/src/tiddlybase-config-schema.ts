import type { } from '@tiddlybase/tw5-types/src/index'
import type * as firebaseui from 'firebaseui';
import { joinPaths } from './join-paths';
import { TiddlyBaseUser } from './users';

export type TiddlerWriteCondition = { titlePrefix: string }; // more options in the future

export type BaseTiddlerStoreSpec = { storeType: 'private' } | { storeType: 'shared' } | { storeType: 'custom', writeCondition: TiddlerWriteCondition };

export type FirestoreTiddlerStoreOptions = Partial<{
  stripDocIDPrefix: string
}>

export type TiddlerSourceSpec =
  | { type: 'http', url: string }
  | { type: 'firebase-storage', pathPostfix: string }
  | ({ type: 'tiddlyweb' } & BaseTiddlerStoreSpec)
  | ({
    type: 'firestore', collection: string, options?: FirestoreTiddlerStoreOptions
  } & BaseTiddlerStoreSpec)
  | ({ type: 'browser-storage', collection: string, useLocalStorage?: boolean } & BaseTiddlerStoreSpec)

export type AuthProviderSpec =
| { type: 'firebase', writeToFirestore?: boolean}
| { type: 'trivial', user?: TiddlyBaseUser };

export interface LaunchConfig {
  // build is the relative path to the child iframe HTML, eg: 'tiddlybase_public/default-build.html'
  build: string,
  sources: TiddlerSourceSpec[],
  auth: AuthProviderSpec,
  wikiInfoConfig: Partial<$tw.WikiInfoConfig>,
  isLocal: boolean
}

const STORAGE_FILES_PATH_SUFFIX = 'files'
const STORAGE_TIDDLER_COLLECTIONS_PATH_SUFFIX = 'tiddler-collections'

/**
 * This interface describes the schema of the `tiddlybase-config.json` file.
 * The contents of this file is meant to be consumed by the code in
 * @tiddlybase/top-level-frame.
 */
export interface TiddlybaseConfig {
  // TODO: rename name to instanceName to make it obvious that this is the
  // name of the tidldyspace instance (of which there can be several in a
  // firebase project).
  instanceName: string,
  htmlGeneration?: {
    title?: string,
    // generated with eg: https://realfavicongenerator.net/
    faviconCode?: string
  }
  clientConfig: {
    projectId: string,
    appId: string,
    databaseURL: string,
    storageBucket: string,
    locationId: string,
    apiKey: string,
    authDomain: string,
    messagingSenderId: string,
    measurementId: string
  },
  authentication: {
    // TODO: decomission jwt-based auth in favor of firestore-backed permissions
    jwtRoleClaim?: string,
    firebaseui?: firebaseui.auth.Config
  } | undefined,
  storage: Partial<$tw.StorageConfig> | undefined,
  functions: {
    location: string
  } | undefined,
  hosting?: {
    site: string
    pathPrefix?: string
  }
  launchConfigs: Record<string, Partial<LaunchConfig>>
}

export const TIDDLYBASE_CLIENT_CONFIG_KEYS = ['instanceName', 'clientConfig', 'authentication', 'storage', 'launchConfigs', 'functions'] as const;

export type TiddlybaseClientConfig = Pick<TiddlybaseConfig, typeof TIDDLYBASE_CLIENT_CONFIG_KEYS[number]>;

export const getJWTRoleClaim = (config: TiddlybaseClientConfig): string => config.authentication?.jwtRoleClaim ?? config.instanceName;
export const getStorageConfig = (config: TiddlybaseClientConfig): $tw.StorageConfig => ({
  tiddlerCollectionsPath: config?.storage?.tiddlerCollectionsPath ?? joinPaths(config.instanceName, STORAGE_TIDDLER_COLLECTIONS_PATH_SUFFIX),
  filesPath: config?.storage?.filesPath ?? joinPaths(config.instanceName, STORAGE_FILES_PATH_SUFFIX)
});
