import { LaunchConfig, LaunchParameters } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { AuthProvider } from "@tiddlybase/shared/src/auth-provider";
import { FirebaseAuthProvider } from "./firebase-auth-provider";
import { Lazy } from "@tiddlybase/shared/src/lazy";
import {FirebaseApp} from '@firebase/app';
import { addFirebaseUI } from "./firebaseui-utils";
import { TrivialAuthProvider } from "./trivial-auth-provider";
import { TiddlyBaseUser } from "@tiddlybase/shared/src/users";
import { ANONYMOUS_USER_ID } from "@tiddlybase/shared/src/constants";
import type * as firebaseui from 'firebaseui';

export const ANONYMOUS_USER:TiddlyBaseUser = {userId: ANONYMOUS_USER_ID};

export const getAuthProvider = (launchParameters: LaunchParameters, launchConfig:LaunchConfig, lazyFirebaseApp: Lazy<FirebaseApp>):AuthProvider => {
 switch (launchConfig.auth.type) {
  case 'firebase':
    const authProvider = new FirebaseAuthProvider(lazyFirebaseApp);
    if (launchConfig.auth.firebaseui) {
      addFirebaseUI(launchParameters, authProvider, '#firebaseui-container', lazyFirebaseApp, launchConfig.auth.firebaseui as firebaseui.auth.Config, launchConfig.auth.writeToFirestore === true)
    }
    return authProvider;
  case 'trivial':
    return new TrivialAuthProvider(launchConfig.auth.user || ANONYMOUS_USER)
  default:
    throw Error(`Invalid auth provider`);
 }
}
