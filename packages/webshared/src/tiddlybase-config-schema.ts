import type {TiddlybaseWikiSettings} from '@tiddlybase/webshared/src/tiddlybase-wiki-settings'
import type * as firebaseui from 'firebaseui';

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
  functions?: {
    location: string
  },
  authentication: firebaseui.auth.Config,
  wikiSettings?: TiddlybaseWikiSettings
}
