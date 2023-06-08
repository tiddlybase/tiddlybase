import { FirebaseAuthProvider } from "./firebase-auth-provider";
import {getFirestore} from "@firebase/firestore"
import {FirebaseApp} from "@firebase/app"
import * as firebaseui from 'firebaseui';
import { FirestoreTiddlerStore } from "../tiddler-io/firestore-tiddler-store";
import { TiddlyBaseUser } from "@tiddlybase/shared/src/users";

export const writeUserProfile = async (firebaseApp: FirebaseApp, user:TiddlyBaseUser) => {
  const firestore = getFirestore(firebaseApp);
    return await (new FirestoreTiddlerStore(
      firestore,
      "admin",
      "users",
      {
        stripDocIDPrefix: "users/"
      }
    )).setTiddler({
      ...user,
      title: `users/${user.uid}`
    })
  }

export const addFirebaseUI = (authProvider: FirebaseAuthProvider, domParentId:string, firebaseUIConfig:firebaseui.auth.Config) => {
  const ui = new firebaseui.auth.AuthUI(authProvider.auth);
  authProvider.onLogout(() => {
    ui.start(domParentId, {
      ...firebaseUIConfig,
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
