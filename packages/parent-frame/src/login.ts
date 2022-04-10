import {GoogleAuthProvider, GithubAuthProvider, EmailAuthProvider, PhoneAuthProvider, getAuth, User} from '@firebase/auth'
import * as firebaseui from 'firebaseui';
import { ui } from './init';

export const toggleVisibleDOMSection = (selectedSectionId?:string) => {
  // rehide all sections
  [...(document.querySelectorAll('.section'))].forEach(section => {
    (section as any).style.display = 'none';
  });
  // show newly selected section
  if (selectedSectionId) {
    (document.getElementById(selectedSectionId) as any).style.display = 'block';
  }
}

function getUiConfig(startTW5: (user: User) => Promise<void>) {
  console.log('running getUiConfig');
  return {
    callbacks: {
      // Called when the user has been successfully signed in.
      // Note: types in node_modules/firebaseui/dist/index.d.ts
      signInSuccessWithAuthResult: function (authResult: any, redirectUrl: string) {
        console.log('running signInSuccessWithAuthResult callback');
        if (authResult.user) {
          handleSignedInUser(startTW5, authResult.user);
        }
        console.log("authResult", authResult)
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
    signInFlow: 'popup',
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
 * @return {string} The URL of the FirebaseUI standalone widget.
 */
function getWidgetUrl() {
  console.log('running getWidgetUrl');
  return '/widget#recaptcha=normal&emailSignInMethod=emailLink';
}

/**
 * Open a popup with the FirebaseUI widget.
 */
export const signInWithPopup = function () {
  console.log('running signInWithPopup');
  window.open(getWidgetUrl(), 'Sign In', 'width=985,height=735');
};

/**
 * Displays the UI for a signed in user.
 * @param {!firebase.User} user
 */
export const handleSignedInUser = async function (startTW5: (user: User) => Promise<void>, user: User) {
  console.log('running handleSignedInUser');
  toggleVisibleDOMSection('user-signed-in');

  /*
  (document.getElementById('name') as any).textContent = user.displayName;
  (document.getElementById('email') as any).textContent = user.email;
  (document.getElementById('phone') as any).textContent = user.phoneNumber;
  let photoURL;
  if (user.photoURL) {
    photoURL = user.photoURL;
    // Append size to the photo URL for Google hosted images to avoid requesting
    // the image with its original resolution (using more bandwidth than needed)
    // when it is going to be presented in smaller size.
    if (photoURL.indexOf('googleusercontent.com') != -1 || photoURL.indexOf('ggpht.com') != -1) {
      photoURL = photoURL + '?sz=' + document.getElementById('photo')?.clientHeight;
    }
    (document.getElementById('photo') as any).src = photoURL;
    (document.getElementById('photo') as any).style.display = 'block';
  } else {
    (document.getElementById('photo') as any).style.display = 'none';
  }
  */

  // --- start tiddlywiki ---
  await startTW5(user);
};

/**
 * Displays the UI for a signed out user.
 */
export const handleSignedOutUser = function (startTW5: (user: User) => Promise<void>) {
  console.log('running handleSignedOutUser');
  toggleVisibleDOMSection('user-signed-out');
  ui.start('#firebaseui-container', getUiConfig(startTW5));
};

/**
 * Deletes the user's account.
 */
export const deleteAccount = function () {
  console.log('running deleteAccount');
    getAuth()
    .currentUser?.delete()
    .catch(function (error:any) {
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

/**
 * Handles when the user changes the reCAPTCHA or email signInMethod config.
 */
export function handleConfigChange(startTW5:(user: User) => Promise<void>) {
  console.log('running handleConfigChange');
  ui.reset();
  ui.start('#firebaseui-container', getUiConfig(startTW5));
}
