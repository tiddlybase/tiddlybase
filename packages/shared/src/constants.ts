import type { AuthProviderSpec, LaunchParameters, URLConfig } from "./tiddlybase-config-schema";

export const DEFAULT_BUILD_NAME = '/tiddlybase_public/default-build.html';
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

export const ADMIN_INSTANCE_NAME = "admin";
export const DEFAULT_INSTANCE_NAME = "welcome";

export const IDENTIFIER_REGEXP = "[^\\s\\/\\\\]+";

const pathRegexpPart = (prefix:string, varName: string, pattern=IDENTIFIER_REGEXP):string => `(?:\\/${prefix}\\/(?<${varName}>${pattern}))?`

export const DEFAULT_URL_CONFIG:URLConfig = {
  publicPath: 'public',
  outerHTML: 'outer.html',
  pathRegExp: `^${pathRegexpPart('i', 'instance')}${pathRegexpPart('t', 'tiddler')}${pathRegexpPart('lc', 'launchConfig')}\\/?$`
}

export const DEFAULT_LAUNCH_PARAMETERS:LaunchParameters = {
  instance: DEFAULT_INSTANCE_NAME,
  launchConfig: DEFAULT_LAUNCH_CONFIG,
}

export const TIDDLYBASE_LOCAL_STATE_PREFIX = "$:/state/tiddlybase/local"
export const TIDDLYBASE_INIT_SINGLETONS_TITLE = "$:/plugins/tiddlybase/init/singletons";
export const TIDDLYBASE_TITLE_USER_PROFILE = `${TIDDLYBASE_LOCAL_STATE_PREFIX}/user`
export const TIDDLYBASE_TITLE_PARENT_LOCATION = `${TIDDLYBASE_LOCAL_STATE_PREFIX}/parent-location`
export const TIDDLYBASE_TITLE_LAUNCH_PARAMETERS = `${TIDDLYBASE_LOCAL_STATE_PREFIX}/launch-parameters`
