import { AuthProviderSpec } from "./tiddlybase-config-schema";

export const DEFAULT_BUILD_NAME = 'tiddlybase_public/default-build.html';
export const DEFAULT_TIDDLER_COLLECTION_FILENAME = 'default-tiddler-collection.json';
export const SEARCH_PARAM_LAUNCH_CONFIG = "launchConfig";
export const DEFAULT_LAUNCH_CONFIG = "default";

export const TIDDLER_TITLE_WIKI_INFO_CONFIG = '$:/config/wikiInfoConfig';

export const DEFAULT_AUTH:AuthProviderSpec = { type: 'firebase', writeToFirestore: true};

export const ANONYMOUS_USER_ID = "anonymous";
