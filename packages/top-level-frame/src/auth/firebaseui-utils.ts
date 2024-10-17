import { FirebaseAuthProvider } from "./firebase-auth-provider";

import {FirebaseApp} from "@firebase/app"
import * as firebaseui from 'firebaseui';
import { Lazy } from "@tiddlybase/shared/src/lazy";
import { LaunchParameters } from "@tiddlybase/shared/src/tiddlybase-config-schema";

const SEARCH_PARAMETER_SIGN_IN_FLOW = 'auth:signInFlow';

export const addFirebaseUI = (launchParameters: LaunchParameters, authProvider: FirebaseAuthProvider, domParentId:string, lazyFirebaseApp:Lazy<FirebaseApp>, firebaseUIConfig:firebaseui.auth.Config) => {
  const ui = new firebaseui.auth.AuthUI(authProvider.auth);
  authProvider.onLogout(() => {
    ui.start(domParentId, {
      ...firebaseUIConfig,
      signInFlow: launchParameters.searchParameters?.[SEARCH_PARAMETER_SIGN_IN_FLOW] ?? firebaseUIConfig.signInFlow,
      callbacks: {
        signInSuccessWithAuthResult: (authResult: any, redirectUrl: string) => {
          console.log("signInSuccessWithAuthResult", authResult, redirectUrl);
          return false;
        },
        signInFailure: (error: firebaseui.auth.AuthUIError): Promise<void> | void => {
          // TODO: provide proper error msg on login error
          console.log('signInFailure', error);
        },
      }
    });
  });
}
