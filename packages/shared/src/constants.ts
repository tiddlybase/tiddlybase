import { AuthProviderSpec } from "./tiddlybase-config-schema";

export const DEFAULT_BUILD_NAME = 'tiddlybase_public/default-build.html';
export const DEFAULT_TIDDLER_COLLECTION_FILENAME = 'default-tiddler-collection.json';
export const SEARCH_PARAM_LAUNCH_CONFIG = "launchConfig";
export const DEFAULT_LAUNCH_CONFIG = "default";

export const DEFAULT_AUTH: AuthProviderSpec = {
  type: 'firebase',
  writeToFirestore: true,
  firebaseui: {
    "signInFlow": "redirect",
    "signInOptions": [{ "provider": "google.com" }],
  }
};

export const ANONYMOUS_USER_ID = "anonymous";

export const ADMIN_INSTANCE_NAME = "admin";
