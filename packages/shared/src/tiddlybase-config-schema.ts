import type { } from '@tiddlybase/tw5-types/src/index'
import type { TiddlyBaseUser } from './users';

export type LaunchParameters = {
  instance: string;
  launchConfig: string;
  userId?: string;
  tiddler?: string;
}

export type TiddlerWriteCondition = { titlePrefix: string }; // more options in the future

export type TiddlerCollectionPathSpec = {
  collection?: string,
  pathTemplate?: string
};

export type WritableTiddlerDataSourceSpec = { writeCondition?: 'private' | 'always' | TiddlerWriteCondition };

export type FirestoreTiddlerDataSourceOptions = Partial<{
  stripDocIDPrefix: string
}>

export type TiddlerDataSourceSpec =
  | { type: 'http', url: string }
  | ({
    type: 'firebase-storage',
    filename: string
  }) & TiddlerCollectionPathSpec
  | ({ type: 'tiddlyweb' } & WritableTiddlerDataSourceSpec)
  | ({
    type: 'firestore',
    options?: FirestoreTiddlerDataSourceOptions
  } & TiddlerCollectionPathSpec & WritableTiddlerDataSourceSpec)
  | ({
    type: 'browser-storage',
    collection: string,
    useLocalStorage?: boolean
  } & TiddlerCollectionPathSpec & WritableTiddlerDataSourceSpec)

export type FileDataSourceSpec =
  | { type: 'http', urlPrefix: string }
  | { type: 'firebase-storage', collection: string }

export type AuthProviderSpec =
  | {
    type: 'firebase',
    writeToFirestore?: boolean,
    // this would actually be the type
    // import type * as firebaseui from 'firebaseui';
    // firebaseui.auth.Config
    // but that seems like an unnecessary dependency here
    firebaseui?: any
  }
  | { type: 'trivial', user?: TiddlyBaseUser };

export type FunctionsEndpoint = { type: "production", region: string } | { type: "development", emulatorHost: string, emulatorPort: number };

export interface FunctionsConfig {
  endpoint: FunctionsEndpoint
}

export interface TiddlersConfig {
  sources: TiddlerDataSourceSpec[]
}

export interface FilesConfig {
  sources: FileDataSourceSpec[];
}

/**
 * A launch configuration specifies how Tiddlybase should start tiddlywiki. It includes which data sources to load tiddlers from, which files are accessible, what user authentication mechanism to use, and optionally firebase functions settings.
 */
export interface LaunchConfig {
  // build is the relative path to the child iframe HTML, eg: 'tiddlybase_public/default-build.html'
  build: string;
  tiddlers: TiddlersConfig;
  files: FilesConfig;
  auth: AuthProviderSpec;
  functions?: FunctionsConfig;
}

export interface URLConfig {
  publicPath: string;
  outerHTML: string;
  pathRegExp: string;
}

export interface FirebaseClientCofig {
  projectId: string;
  appId: string;
  databaseURL?: string;
  storageBucket: string;
  locationId?: string;
  apiKey: string;
  authDomain: string;
  messagingSenderId: string;
  measurementId?: string;
}

/**
 * This interface describes the schema of the `tiddlybase-config.json` file.
 */
export interface TiddlybaseConfig {
  /**
   * Settings related to the generation of the parent HTML (usually called outer.html)
   */
  htmlGeneration?: {
    title?: string,
    // generated with eg: https://realfavicongenerator.net/
    faviconCode?: string
  };
  /**
   * These values can be copied from the Firebase console or
   * from the command line via "yarn firebase apps:sdkconfig web"
   */
  firebase?: {
    clientConfig: FirebaseClientCofig,
    hosting?: {
      site: string
    }
  };
  urls?: Partial<URLConfig>;
  defaultLaunchParameters?: Partial<LaunchParameters>;
  launchConfigs: Record<string, Partial<LaunchConfig>>;
}

// The client config is written to outer.html.
// It only needs certain parts of the full tiddlybase-config.json.
export const TIDDLYBASE_CLIENT_CONFIG_KEYS: Readonly<Array<keyof TiddlybaseConfig>> = ['defaultLaunchParameters', 'launchConfigs', 'firebase', 'urls'] as const;

export type TiddlybaseClientConfig = Pick<TiddlybaseConfig, typeof TIDDLYBASE_CLIENT_CONFIG_KEYS[number]>;
