import type {} from '@tiddlybase/tw5-types/src/index'
import type * as firebaseui from 'firebaseui';
import { joinPaths } from './join-paths';

export type TiddlerSourceSpec =
  | { type: 'http', url: string }
  | { type: 'firebase-storage', pathPostfix: string }
  | { type: 'tiddlyweb', url: string }
  | { type: 'firestore', collection: string }

export interface LaunchConfig {
  // build is the relative path to the child iframe HTML, eg: 'tiddlybase_public/default-build.html'
  build: string,
  sources: TiddlerSourceSpec[],
  settings: Partial<$tw.WikiInfoConfig>,
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
  topLevel? : {
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
    // TODO: decomission jwt-based auth in favor of firestore-back permissions
    jwtRoleClaim?: string,
    firebaseui: firebaseui.auth.Config
  },
  storage?: Partial<$tw.StorageConfig>,
  functions?: {
    location: string
  },
  hosting? : {
    site: string
    pathPrefix?: string
  }
  launchConfigs?: Record<string, Partial<LaunchConfig>>
}

export const getJWTRoleClaim = (config:TiddlybaseConfig):string => config.authentication.jwtRoleClaim ?? config.instanceName;
export const getStorageConfig = (config:TiddlybaseConfig):$tw.StorageConfig => ({
  tiddlerCollectionsPath: config?.storage?.tiddlerCollectionsPath ?? joinPaths(config.instanceName, STORAGE_TIDDLER_COLLECTIONS_PATH_SUFFIX),
  filesPath: config?.storage?.filesPath ?? joinPaths(config.instanceName, STORAGE_FILES_PATH_SUFFIX)
});
