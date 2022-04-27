import {initializeApp} from '@firebase/app'
import {getAuth} from '@firebase/auth'
import type { User } from '@firebase/auth';
import * as firebaseui from 'firebaseui';

const config = {
  "apiKey": "AIzaSyCOmUqLxAe2O-elEnk-ykX76P45IAZ5Ouc",
  "authDomain": "wiki.peterneumark.com",
  "databaseURL": "https://peterneumark-com.firebaseio.com",
  "projectId": "peterneumark-com",
  "storageBucket": "peterneumark-com.appspot.com",
  "messagingSenderId": "1019270346260",
  "appId": "1:1019270346260:web:2064fdcb65a50ee1c51901"
}

export const firebaseApp = initializeApp(config);
export const firebaseAuth = getAuth(firebaseApp);
export const ui = new firebaseui.auth.AuthUI(getAuth(firebaseApp));
export const isLocalEnv = window.location.hostname === 'localhost' && new URLSearchParams(window.location.search).get('local_wiki') === 'true';
export type StartTW5 = (user: User) => Promise<void>;
