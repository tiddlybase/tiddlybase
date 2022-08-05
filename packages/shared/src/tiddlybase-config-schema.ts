import type {} from '@tiddlybase/tw5-types/src/index'
import type * as firebaseui from 'firebaseui';

export interface WikiLaunchConfig {
  build: string,
  wikiNames: string[],
  settings?: Partial<$tw.WikiInfoConfig>
}

/**
 * This interface describes the schema of the `tiddlybase-config.json` file.
 * The contents of this file is meant to be consumed by the code in
 * @tiddlybase/top-level-frame.
 */
export interface TiddlybaseConfig {
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
  authentication: firebaseui.auth.Config,
  storage: $tw.StorageConfig,
  functions?: {
    location: string
  },
  launchConfigs?: Record<string, WikiLaunchConfig>
}
