import type {} from '@tiddlybase/tw5-types/src/index'
import type * as firebaseui from 'firebaseui';
import { joinPaths } from './join-paths';

export interface WikiLaunchConfig {
  build: string,
  wikiNames: string[],
  settings: Partial<$tw.WikiInfoConfig>
}

const STORAGE_FILES_PATH_SUFFIX = 'files'
const STORAGE_WIKIS_PATH_SUFFIX = 'wikis'

/**
 * This interface describes the schema of the `tiddlybase-config.json` file.
 * The contents of this file is meant to be consumed by the code in
 * @tiddlybase/top-level-frame.
 */
export interface TiddlybaseConfig {
  name: string,
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
  launchConfigs?: Record<string, Partial<WikiLaunchConfig>>
}

export const getJWTRoleClaim = (config:TiddlybaseConfig):string => config.authentication.jwtRoleClaim ?? config.name;
export const getStorageConfig = (config:TiddlybaseConfig):$tw.StorageConfig => ({
  wikisPath: config?.storage?.filesPath ?? joinPaths(config.name, STORAGE_WIKIS_PATH_SUFFIX),
  filesPath: config?.storage?.filesPath ?? joinPaths(config.name, STORAGE_FILES_PATH_SUFFIX)
});
