import type { } from '@tiddlybase/tw5-types/src/index'
import type { TiddlyBaseUser } from './users';

export type TiddlerWriteCondition = { titlePrefix: string }; // more options in the future

export type WritableTiddlerDataSourceSpec = { writeCondition?: 'private' | 'always' | TiddlerWriteCondition };

export type FirestoreTiddlerDataSourceOptions = Partial<{
  stripDocIDPrefix: string
}>

export type TiddlerDataSourceSpec =
  | { type: 'http', url: string }
  | { type: 'firebase-storage', collection: string, filename: string }
  | ({ type: 'tiddlyweb' } & WritableTiddlerDataSourceSpec)
  | ({
    type: 'firestore', collection: string, options?: FirestoreTiddlerDataSourceOptions
  } & WritableTiddlerDataSourceSpec)
  | ({ type: 'browser-storage', collection: string, useLocalStorage?: boolean } & WritableTiddlerDataSourceSpec)

export type FileDataSourceSpec =
  | {type: 'http', urlPrefix: string}
  | {type: 'firebase-storage', collection: string}

export type AuthProviderSpec =
| {
    type: 'firebase',
    writeToFirestore?: boolean,
    // this would actually be the type
    // import type * as firebaseui from 'firebaseui';
    // firebaseui.auth.Config
    // but that seems like an unnecessary dependency here
    firebaseui?: any}
| { type: 'trivial', user?: TiddlyBaseUser };

export type FunctionsEndpoint = {type: "production", region: string} | {type: "development", emulatorHost: string, emulatorPort: number};

export interface FunctionsConfig {
  endpoint: FunctionsEndpoint
}

export interface TiddlersConfig {
  sources: TiddlerDataSourceSpec[]
}

export interface FilesConfig {
  sources: FileDataSourceSpec[]
}

export interface LaunchConfig {
  // build is the relative path to the child iframe HTML, eg: 'tiddlybase_public/default-build.html'
  build: string,
  tiddlers: TiddlersConfig,
  files: FilesConfig,
  auth: AuthProviderSpec,
  wikiInfoConfig: Partial<$tw.WikiInfoConfig>,
  functions?: FunctionsConfig
}

/**
 * This interface describes the schema of the `tiddlybase-config.json` file.
 * The contents of this file is meant to be consumed by the code in
 * @tiddlybase/top-level-frame.
 */
export interface TiddlybaseConfig {
  instanceName: string,
  htmlGeneration?: {
    title?: string,
    // generated with eg: https://realfavicongenerator.net/
    faviconCode?: string
  }
  firebaseClientConfig: {
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
  hosting?: {
    site: string
    pathPrefix?: string
  }
  launchConfigs: Record<string, Partial<LaunchConfig>>
}

// The client config is written to outer.html.
// It only needs certain parts of the full tiddlybase-config.json.
export const TIDDLYBASE_CLIENT_CONFIG_KEYS:Readonly<Array<keyof TiddlybaseConfig>> = ['instanceName', 'firebaseClientConfig', 'launchConfigs'] as const;

export type TiddlybaseClientConfig = Pick<TiddlybaseConfig, typeof TIDDLYBASE_CLIENT_CONFIG_KEYS[number]>;
