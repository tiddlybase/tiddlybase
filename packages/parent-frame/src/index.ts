import type { FirebaseError } from '@firebase/util';
import { getAuth, User } from '@firebase/auth';
import { makeRPC } from '@tiddlybase/rpc';
import { firebaseApp, isLocalEnv, ui } from './init';
import { handleSignedInUser, handleSignedOutUser, toggleVisibleDOMSection } from './login';
import { createParentApi, getDownloadURL } from './parent-api-impl';

const getWikiURL = async () => {
  return (isLocalEnv ? 'wiki.html' : await getDownloadURL('csaladwiki/wiki.html')) + window.location.hash;
}

const createWikiIframe = async () => {
  let src:string;
  try {
    src = await getWikiURL();
  } catch (e) {
    const err = e as FirebaseError
    if (err?.code === 'storage/unauthorized') {
      toggleVisibleDOMSection('user-unauthorized');
    }
  }
  const parentElement = document.getElementById('wiki-frame-parent');
  const iframe = document.createElement('iframe');
  iframe.src = src!;
  // see: https://stackoverflow.com/questions/25387977/typescript-iframe-sandbox-property-undefined-domsettabletokenlist-has-no-cons
  (<any>iframe).sandbox = 'allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox';
  // todo: this could be configurable to use a different tw5 build for eg mobile devices / translations, etc
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
  console.log('running initApp')

  let tw5Started = false;

  const startTW5 = async (user: User) => {
    if (tw5Started) {
      console.log("tw5 already started, not starting again")
      return;
    }
    console.log('running startTW5');
    const rpc = makeRPC();
    const iframe = await createWikiIframe();
    createParentApi(rpc, user, iframe.contentWindow!);
    console.log("child iframe created");
    tw5Started = true;
  };

  // Listen to change in auth state so it displays the correct UI for when
  // the user is signed in or not.
  getAuth(firebaseApp).onAuthStateChanged(function (user: User | null) {
    console.log('running onAuthStateChanged callback');
    user ? handleSignedInUser(startTW5, user!) : handleSignedOutUser(startTW5);
  });
  // Initialize the FirebaseUI Widget using Firebase.

  // Disable auto-sign in.
  ui.disableAutoSignIn();
  // document.getElementById('sign-in-with-redirect').addEventListener( 'click', signInWithRedirect);
  /*
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
  */
};

window.addEventListener('load', initApp);
