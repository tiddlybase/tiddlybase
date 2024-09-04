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
export const ADMIN_COLLECTION_NAME = "admin";
export const INSTANCE_CONFIGURATION_TIDDLER_NAME = "instance-configuration";
export const DEFAULT_INSTANCE_NAME = "welcome";

export const DEFAULT_URL_CONFIG:URLConfig = {
  publicPath: 'public',
  outerHTML: 'outer.html',
  pathTemplate: [
    {shortName: 'lc', variableName: 'launchConfig'},
    {shortName: 'i', variableName: 'instance'},
    {shortName: 'vs', variableName: 'viewState', encoding: 'base64'},
    {shortName: 't', variableName: 'tiddler', encoding: 'encodeURI' , pattern: '.*'}
  ]
}

export const DEFAULT_LAUNCH_PARAMETERS:LaunchParameters = {
  instance: DEFAULT_INSTANCE_NAME,
  launchConfig: DEFAULT_LAUNCH_CONFIG,
}

export const DEFAULT_LAUNCH_PARAMETER_DOMAIN = "*";

export const TIDDLYBASE_LOCAL_STATE_PREFIX = "$:/state/tiddlybase/local"
export const TIDDLYBASE_INIT_SINGLETONS_TITLE = "$:/plugins/tiddlybase/init/singletons";
export const TIDDLYBASE_TITLE_TIDDLER_SOURCES = `${TIDDLYBASE_LOCAL_STATE_PREFIX}/tiddler-sources`;
export const TIDDLYBASE_TITLE_TIDDLER_PROVENANCE = `${TIDDLYBASE_LOCAL_STATE_PREFIX}/tiddler-provenance`;
export const TIDDLYBASE_TITLE_USER_PROFILE = `${TIDDLYBASE_LOCAL_STATE_PREFIX}/user`
export const TIDDLYBASE_TITLE_PARENT_LOCATION = `${TIDDLYBASE_LOCAL_STATE_PREFIX}/parent-location`
export const TIDDLYBASE_TITLE_LAUNCH_PARAMETERS = `${TIDDLYBASE_LOCAL_STATE_PREFIX}/launch-parameters`
export const TIDDLYBASE_TITLE_PATH_TEMPLATE = `${TIDDLYBASE_LOCAL_STATE_PREFIX}/path-template`
export const TIDDLYBASE_TITLE_TIDDLER_ARGUMENTS = "$:/state/tiddler-arguments/"

// Default story and history lists
export const TW5_TITLE_STORY_LIST = "$:/StoryList";
export const TW5_TITLE_HISTORY_LIST = "$:/HistoryList";
export const TW5_TITLE_DEFAULT_TIDDLERS = "$:/DefaultTiddlers";
export const TW5_TITLE_SIDEBAR = "$:/state/sidebar";
export const TW5_TITLE_PREFIX_FOLDED = "$:/state/folded/";
export const TW5_TITLE_GETTING_STARTED = "GettingStarted"
export const TW5_TITLE_ANIMATION_DURATION = "$:/config/AnimationDuration"
