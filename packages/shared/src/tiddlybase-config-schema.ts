import type { } from "@tiddlybase/tw5-types/src/index";
import type { TiddlyBaseUser } from "./users";
import type { Expression } from "./expressions";
import { PathTemplate } from "./path-template";

export type SearchVariables = Record<string, string>;

export type LaunchParameters = {
  instance: string;
  launchConfig: string;
  userId?: string;
  searchParameters?: SearchVariables;
};

export type TiddlerCollectionPathSpec = {
  collection?: string;
  pathTemplate?: string;
};

export type CommonConditionAssertion =  true | false | "authenticated"

export type TiddlerConditionAssertion =
  CommonConditionAssertion
  | "private"
  | { titlePrefix: string };

export type LaunchParametersConditionAssertion = CommonConditionAssertion;

export type FirestoreTiddlerStorageOptions = Partial<{
  stripDocIDPrefix: string;
}>;

export type FirestoreWhereFilterOp =
    | '<'
    | '<='
    | '=='
    | '!='
    | '>='
    | '>'
    | 'array-contains'
    | 'in'
    | 'not-in'
    | 'array-contains-any';

export type FirestoreWhereClause = {
  path: string | string[],
  operator: FirestoreWhereFilterOp,
  value: any
}

export type FireStoreQuery = {
  from: {"collection": string} | {"collectionGroup": string},
  where: FirestoreWhereClause | FirestoreWhereClause[]
}

export type FirestoreQueryTiddlerStorageOptions = Partial<{
  pathPrefixTemplate: string
}>

type TiddlerStorageTypeSpec =
  | { type: "http"; url: string }
  | ({
    type: "firebase-storage";
    filename: string;
  } & TiddlerCollectionPathSpec)
  | { type: "tiddlyweb" }
  | ({
    type: "firestore";
    options?: FirestoreTiddlerStorageOptions;
  } & TiddlerCollectionPathSpec)
  | ({
    type: "firestore-query";
    query: FireStoreQuery;
    options?: FirestoreQueryTiddlerStorageOptions;
  })
  | ({
    type: "browser-storage";
    collection: string;
    useLocalStorage?: boolean;
  } & TiddlerCollectionPathSpec)
  | {
    type: "literal";
    tiddlers: $tw.TiddlerFields[]
  };

export type TiddlerStorageUseCondition = Expression<LaunchParametersConditionAssertion>;
export type TiddlerStorageWriteCondition = Expression<TiddlerConditionAssertion>;
export type PinTiddlerToStorageCondition = Expression<TiddlerConditionAssertion>;

export type TiddlerStorageSpec = TiddlerStorageTypeSpec & {
  useCondition?: TiddlerStorageUseCondition;
  writeCondition?: TiddlerStorageWriteCondition;
  pinTiddlerCondition?: PinTiddlerToStorageCondition;
};

export type FileStorageSpec =
  | { type: "http"; urlPrefix: string }
  | { type: "firebase-storage"; collection: string };

export type AuthProviderSpec =
  | {
    type: "firebase";
    firebaseui?: any;
  }
  | { type: "trivial"; user?: TiddlyBaseUser };

export type FunctionsEndpoint =
  | { type: "production"; region: string }
  | { type: "development"; emulatorHost: string; emulatorPort: number };

export interface FunctionsConfig {
  endpoint: FunctionsEndpoint;
}

export interface TiddlersConfig {
  storage: TiddlerStorageSpec[];
}

export interface FilesConfig {
  storage: FileStorageSpec[];
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
  pathTemplate: PathTemplate;
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
    title?: string;
    // generated with eg: https://realfavicongenerator.net/
    faviconCode?: string;
  };
  /**
   * These values can be copied from the Firebase console or
   * from the command line via "yarn firebase apps:sdkconfig web"
   */
  firebase?: {
    clientConfig: FirebaseClientCofig;
    hosting?: {
      site: string;
    };
  };
  urls?: Partial<URLConfig>;
  /**
   * Matches domain to launch parameters. If current domain is not found,
   * attempts to use "*" record if it exists.
   */
  defaultLaunchParameters?: Record<string, Partial<LaunchParameters>>;
  launchConfigs: Record<string, Partial<LaunchConfig>>;
}

// The client config is written to outer.html.
// It only needs certain parts of the full tiddlybase-config.json.
export const TIDDLYBASE_CLIENT_CONFIG_KEYS: Readonly<
  Array<keyof TiddlybaseConfig>
> = ["defaultLaunchParameters", "launchConfigs", "firebase", "urls"] as const;

export type TiddlybaseClientConfig = Pick<
  TiddlybaseConfig,
  (typeof TIDDLYBASE_CLIENT_CONFIG_KEYS)[number]
>;
