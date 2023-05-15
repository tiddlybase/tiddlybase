import {initializeApp} from '@firebase/app'
import {getAuth} from '@firebase/auth'
import type { User } from '@firebase/auth';
import * as firebaseui from 'firebaseui';
import type { TiddlybaseConfig, LaunchConfig } from '@tiddlybase/shared/src/tiddlybase-config-schema';
import type { FirebaseStorage } from '@firebase/storage';
import type { Firestore } from '@firebase/firestore';
import type { Functions } from '@firebase/functions'

export type StartTW5 = (user: User) => Promise<void>;

export interface FirebaseState {
  app: ReturnType<typeof initializeApp>,
  auth: ReturnType<typeof getAuth>,
  ui: firebaseui.auth.AuthUI,
  tiddlybaseConfig: TiddlybaseConfig,
  launchConfig: LaunchConfig
}

export interface FirebaseAPIs {
  storage?: FirebaseStorage;
  firestore?: Firestore;
  functions?: Functions;
}
