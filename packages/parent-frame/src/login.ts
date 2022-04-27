import { GoogleAuthProvider, GithubAuthProvider, EmailAuthProvider, PhoneAuthProvider, getAuth, User } from '@firebase/auth'
import * as firebaseui from 'firebaseui';
import { firebaseAuth, ui, StartTW5 } from './init';

export const toggleVisibleDOMSection = (selectedSectionId?: string) => {
  console.log('toggleVisibleDOMSection', selectedSectionId);
  // rehide all sections
  [...(document.querySelectorAll('.section'))].forEach(section => {
    (section as any).style.display = 'none';
  });
  // show newly selected section
  if (selectedSectionId) {
    (document.getElementById(selectedSectionId) as any).style.display = 'block';
  }
}

const sleep = (ms:number) => new Promise((resolve) => {
  setTimeout(resolve, ms);
})

function getUiConfig(startTW5: (user: User) => Promise<void>) {
  console.log('running getUiConfig');
  return {
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
            return firebaseAuth.currentUser?.getIdToken(true)
          }).then((...args: any[]) => {
            console.log("refreshed token, got", args);
            handleSignedInUser(startTW5, firebaseAuth.currentUser!);
          });
        } else if (authResult.user) {
          console.log("welcome, existing user!");
          handleSignedInUser(startTW5, authResult.user);
        }
        // Do not redirect.
        return false;
      },
      signInFailure: (error: firebaseui.auth.AuthUIError): Promise<void> | void => {
        // TODO: provide proper error msg on login error
        console.log('auth error', error);
      },
    },
    // Opens IDP Providers sign-in flow in a popup.
    // TODO: change this to 'redirect'
    signInFlow: 'redirect',
    signInOptions: [
      {
        provider: GoogleAuthProvider.PROVIDER_ID,
        // get this from GCP Credentials page
        // TODO: make this come from config.json
        clientId: '1019270346260-fh2s7fjmige0qlu6nonmm514rvrafbd9.apps.googleusercontent.com',
      },
      /*
      {
        provider: firebase.auth.FacebookAuthProvider.PROVIDER_ID,
        scopes :[
          'public_profile',
          'email',
          'user_likes',
          'user_friends'
        ]
      },
      */
      //firebase.auth.TwitterAuthProvider.PROVIDER_ID,
      GithubAuthProvider.PROVIDER_ID,
      {
        provider: EmailAuthProvider.PROVIDER_ID,
        // Whether the display name should be displayed in Sign Up page.
        requireDisplayName: true,
        signInMethod: 'emailLink',
      },
      {
        provider: PhoneAuthProvider.PROVIDER_ID,
        recaptchaParameters: {
          size: 'normal',
        },
      },
      /*{
        provider: 'microsoft.com',
        loginHintKey: 'login_hint'
      },
      {
        provider: 'apple.com',
      },
      firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID*/
    ],
    // TODO: Terms of service url.
    tosUrl: '/tos.html',
    // TODO: Privacy policy url.
    privacyPolicyUrl: '/privacy.html',
    credentialHelper: firebaseui.auth.CredentialHelper.GOOGLE_YOLO,
  };
}

/**
 * Displays the UI for a signed in user.
 * @param {!firebase.User} user
 */
export const handleSignedInUser = async function (startTW5: StartTW5, user: User) {
  console.log('running handleSignedInUser');
  toggleVisibleDOMSection('user-signed-in');
  await startTW5(user);
};

/**
 * Displays the UI for a signed out user.
 */
export const handleSignedOutUser = async function (startTW5: StartTW5) {
  console.log('running handleSignedOutUser');
  toggleVisibleDOMSection('user-signed-out');
  ui.start('#firebaseui-container', getUiConfig(startTW5));
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
