import { firebaseApp, isLocal, ui } from './init';
import { deleteAccount, handleConfigChange, handleSignedInUser, handleSignedOutUser, signInWithPopup } from './login';
import {getAuth, User} from '@firebase/auth'
import {makeRPC} from '@firebase-auth-loader/rpc'
import { createParentApi, getDownloadURL } from './parent-api-impl';

const getWikiURL = async () => {
  return (isLocal ? 'wiki.html' : await getDownloadURL('csaladwiki/wiki.html')) + window.location.hash;
}

const createWikiIframe = async () => {
  const parentElement = document.getElementById('wiki-frame-parent');
  const iframe = document.createElement('iframe');
  // see: https://stackoverflow.com/questions/25387977/typescript-iframe-sandbox-property-undefined-domsettabletokenlist-has-no-cons
  (<any>iframe).sandbox = 'allow-scripts';
  // todo: this could be configurable to use a different tw5 build for eg mobile devices / translations, etc
  iframe.src = await getWikiURL();
  iframe.name = JSON.stringify(window.location);
  iframe.frameBorder="0"
  iframe.allowFullscreen=true
  /*
  iframe.width = String(
    window.innerWidth ?? window.document?.documentElement?.clientWidth ?? window.document?.body?.clientWidth,
  );
  iframe.height = String(
    window.innerHeight ?? window.document?.documentElement?.clientHeight ?? window.document?.body?.clientHeight,
  );
  */
  parentElement?.appendChild(iframe);
  return iframe;
};

/**
 * Initializes the app.
 */
const initApp = async () => {

  const startTW5 = async (user: User) => {
    const rpc = makeRPC();
    const iframe = await createWikiIframe();
    createParentApi(rpc, user, iframe.contentWindow!);
    console.log("child iframe created");
  };

  // Listen to change in auth state so it displays the correct UI for when
  // the user is signed in or not.
  getAuth(firebaseApp).onAuthStateChanged(function (user: User | null) {
    (document.getElementById('loading') as any).style.display = 'none';
    (document.getElementById('loaded') as any).style.display = 'block';
    user ? handleSignedInUser(startTW5, user!) : handleSignedOutUser(startTW5);
  });
  // Initialize the FirebaseUI Widget using Firebase.

  // Disable auto-sign in.
  ui.disableAutoSignIn();
  // document.getElementById('sign-in-with-redirect').addEventListener( 'click', signInWithRedirect);
  document.getElementById('sign-in-with-popup')?.addEventListener('click', signInWithPopup);
  document.getElementById('sign-out')?.addEventListener('click', () => getAuth(firebaseApp).signOut());
  document.getElementById('delete-account')?.addEventListener('click', () => deleteAccount());
  document.getElementById('recaptcha-normal')?.addEventListener('change', () => handleConfigChange(startTW5));
  document.getElementById('recaptcha-invisible')?.addEventListener('change', () => handleConfigChange(startTW5));
  // Check the selected reCAPTCHA mode.
  //(document.querySelector('input[name="recaptcha"][value="' + getRecaptchaMode() + '"]') as any).checked = true;
  document
    .getElementById('email-signInMethod-password')
    ?.addEventListener('change', () => handleConfigChange(startTW5));
  document
    .getElementById('email-signInMethod-emailLink')
    ?.addEventListener('change', () => handleConfigChange(startTW5));
  // Check the selected email signInMethod mode.
  //(document.querySelector('input[name="emailSignInMethod"][value="' + getEmailSignInMethod() + '"]') as any).checked = true;
};

window.addEventListener('load', initApp);
