import type { FirebaseError } from '@firebase/util';
import { User } from '@firebase/auth';
import { makeRPC } from '@tiddlybase/rpc';
import { firebaseAuth, isLocalEnv, StartTW5, ui } from './init';
import { handleSignedInUser, handleSignedOutUser, toggleVisibleDOMSection } from './login';
import { createParentApi, getDownloadURL } from './top-level-api-impl';

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
    return;
  }
  const parentElement = document.getElementById('wiki-frame-parent');
  const iframe = document.createElement('iframe');
  iframe.src = src!;
  // see: https://stackoverflow.com/questions/25387977/typescript-iframe-sandbox-property-undefined-domsettabletokenlist-has-no-cons
  (<any>iframe).sandbox = 'allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox allow-forms';
  // todo: this could be configurable to use a different tw5 build for eg mobile devices / translations, etc
  iframe.name = JSON.stringify(window.location);
  iframe.frameBorder="0"
  iframe.allowFullscreen=true
  parentElement?.appendChild(iframe);
  return iframe;
};

/**
 * Initializes the app.
 */
const initApp = async () => {
  console.log('running initApp')

  let tw5Started = false;

  const startTW5:StartTW5 = async (user: User) => {
    if (tw5Started) {
      console.log("tw5 already started, not starting again")
      return;
    }
    // just in case, remove any previous wiki iframes
    console.log('running startTW5');
    const iframe = await createWikiIframe();
    if (iframe) {
      const rpc = makeRPC();
      createParentApi(rpc, user, iframe.contentWindow!);
      console.log("child iframe created");
      tw5Started = true;
    } else {
      console.log("child iframe could not be created");
    }
  };

  // Listen to change in auth state so it displays the correct UI for when
  // the user is signed in or not.
  firebaseAuth.onAuthStateChanged(function (user: User | null) {
    console.log('running onAuthStateChanged callback');
    user ? handleSignedInUser(startTW5, user!) : handleSignedOutUser(startTW5);
  });
  // Initialize the FirebaseUI Widget using Firebase.

  // Disable auto-sign in.
  ui.disableAutoSignIn();
};

window.addEventListener('load', initApp);
