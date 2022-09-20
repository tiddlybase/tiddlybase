import { getAuth, User } from '@firebase/auth'
import * as firebaseui from 'firebaseui';
import { toggleVisibleDOMSection } from './dom-utils';
import { FirebaseState, StartTW5 } from './types';


const sleep = (ms:number) => new Promise((resolve) => {
  setTimeout(resolve, ms);
})

function getUiConfig(firebaseState:FirebaseState, startTW5: StartTW5) {
  console.log('running getUiConfig');
  return {
    ...firebaseState.tiddlybaseConfig.authentication.firebaseui,
    callbacks: {
      // Called when the user has been successfully signed in.
      // Note: types in node_modules/firebaseui/dist/index.d.ts
      signInSuccessWithAuthResult: function (authResult: any, redirectUrl: string) {
        console.log('running signInSuccessWithAuthResult callback');
        console.log("authResult", authResult);
        if (authResult?.additionalUserInfo?.isNewUser === true) {
          console.log("welcome, new user!");
          // display loading instead of unauthorized
          toggleVisibleDOMSection('loading');
          // wait 4 seconds for onSignup cloud function to run
          sleep(4000).then(() => {
            // new signin, must refresh token before loading wiki
            console.log("refreshing access token!");
            // force token refresh so new custom claims propagate
            return firebaseState.auth.currentUser?.getIdToken(true)
          }).then((...args: any[]) => {
            console.log("refreshed token, got", args);
            handleSignedInUser(firebaseState, startTW5, firebaseState.auth.currentUser!);
          });
        } else if (authResult.user) {
          console.log("welcome, existing user!");
          handleSignedInUser(firebaseState, startTW5, authResult.user);
        }
        // Do not redirect.
        return false;
      },
      signInFailure: (error: firebaseui.auth.AuthUIError): Promise<void> | void => {
        // TODO: provide proper error msg on login error
        console.log('auth error', error);
      },
    },
  };
}

/**
 * Displays the UI for a signed in user.
 * @param {!firebase.User} user
 */
export const handleSignedInUser = async function (firebaseState:FirebaseState, startTW5: StartTW5, user: User) {
  console.log('running handleSignedInUser');
  toggleVisibleDOMSection('user-signed-in');
  await startTW5(user);
};

/**
 * Displays the UI for a signed out user.
 */
export const handleSignedOutUser = async function (firebaseState:FirebaseState, startTW5: StartTW5) {
  console.log('running handleSignedOutUser');
  toggleVisibleDOMSection('user-signed-out');
  firebaseState.ui.start('#firebaseui-container', getUiConfig(firebaseState, startTW5));
};

/**
 * Deletes the user's account.
 */
export const deleteAccount = async function () {
  console.log('running deleteAccount');
  getAuth()
    .currentUser?.delete()
    .catch(function (error: any) {
      if (error?.code == 'auth/requires-recent-login') {
        // The user's credential is too old. She needs to sign in again.
        getAuth()
          .signOut()
          .then(function () {
            // The timeout allows the message to be displayed after the UI has
            // changed to the signed out state.
            setTimeout(function () {
              alert('Please sign in again to delete your account.');
            }, 1);
          });
      }
    });
};