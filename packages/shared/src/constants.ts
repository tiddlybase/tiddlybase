import { AuthProviderSpec, LaunchParameters, URLConfig } from "./tiddlybase-config-schema";

export const DEFAULT_BUILD_NAME = 'tiddlybase_public/default-build.html';
export const DEFAULT_TIDDLER_COLLECTION_FILENAME = 'default-tiddler-collection.json';
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
export const DEFAULT_INSTANCE_NAME = "welcome";

export const IDENTIFIER_REGEXP = "[^\\s\\/\\\\]+";

export const DEFAULT_URL_CONFIG:URLConfig = {
  publicPath: 'public',
  outerHTML: 'outer.html',
  pathRegexp: `^(?:\\/lc\\/(?<launchConfig>${IDENTIFIER_REGEXP}))?(?:\\/i\\/(?<instance>${IDENTIFIER_REGEXP}))?(?:\\/t\\/(?<tiddler>${IDENTIFIER_REGEXP}))?\\/?$`
}

export const DEFAULT_LAUNCH_PARAMETERS:LaunchParameters = {
  instance: DEFAULT_INSTANCE_NAME,
  launchConfig: DEFAULT_LAUNCH_CONFIG
}
