import { FirebaseAuthProvider } from "./firebase-auth-provider";
import {getFirestore} from "@firebase/firestore"
import {FirebaseApp} from "@firebase/app"
import * as firebaseui from 'firebaseui';
import { FirestoreDataSource } from "../tiddler-data-sources/firestore-tiddler-source";
import { TiddlyBaseUser } from "@tiddlybase/shared/src/users";
import { objFilter } from '@tiddlybase/shared/src/obj-utils';
import { Lazy } from "@tiddlybase/shared/src/lazy";
import { LaunchParameters } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { ADMIN_INSTANCE_NAME } from "@tiddlybase/shared/src/constants";

const SEARCH_PARAMETER_SIGN_IN_FLOW = 'auth:signInFlow';

export const writeUserProfile = async (launchParameters: LaunchParameters, lazyFirebaseApp:Lazy<FirebaseApp>, user:TiddlyBaseUser) => {
  const firestore = getFirestore(lazyFirebaseApp());
    return await (new FirestoreDataSource(
      {
        ...launchParameters,
        instance: ADMIN_INSTANCE_NAME
      },
      firestore,
      "users",
      undefined,
      {
        stripDocIDPrefix: "users/"
      }
    )).setTiddler({
      // firestore can't write undefined values, so if any field is undefined,
      // filter it out. TODO: this should happen in FirestoreTiddlerStore
      ...objFilter((_k, v) => v !== undefined, (user as any)),
      creator: user.userId,
      modifier: user.userId,
      title: `users/${user.userId}`
    })
  }

export const addFirebaseUI = (launchParameters: LaunchParameters, authProvider: FirebaseAuthProvider, domParentId:string, lazyFirebaseApp:Lazy<FirebaseApp>, firebaseUIConfig:firebaseui.auth.Config, writeToFirestore:boolean) => {
  const ui = new firebaseui.auth.AuthUI(authProvider.auth);
  if (writeToFirestore) {
    authProvider.onLogin((user, authDetails) => {
      if (!authDetails.lastLogin) {
        writeUserProfile(launchParameters, lazyFirebaseApp, user);
      }
    });
  }
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
