import {initializeApp} from '@firebase/app'
import {getAuth} from '@firebase/auth'
import type { User } from '@firebase/auth';
import * as firebaseui from 'firebaseui';
import type { TiddlybaseConfig } from '@tiddlybase/webshared/src/tiddlybase-config-schema';

export type StartTW5 = (user: User) => Promise<void>;

export interface FirebaseState {
  app: ReturnType<typeof initializeApp>,
  auth: ReturnType<typeof getAuth>,
  ui: firebaseui.auth.AuthUI,
  config: TiddlybaseConfig,
}
