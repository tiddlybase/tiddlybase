import { User } from '@firebase/auth';
import { makeRPC } from '@tiddlybase/rpc';
import { handleSignedInUser, handleSignedOutUser } from './login';
import { createParentApi } from './top-level-api-impl';
import { TiddlybaseConfig, WikiLaunchConfig } from '@tiddlybase/shared/src/tiddlybase-config-schema';
import { TIDDLYBASE_CONFIG_URL } from '@tiddlybase/shared/src/constants'
import { parseSearchParams, isLocal } from '@tiddlybase/shared/src/search-params'
import { initializeApp } from '@firebase/app'
import { getAuth } from '@firebase/auth'
import * as firebaseui from 'firebaseui';
import { FirebaseState, StartTW5 } from './types';
import type { } from '@tiddlybase/tw5-types/src/index'
import { getLaunchConfig } from './launch-config';

const createWikiIframe = async (build?: string) => {
  // append URL fragment so permalinks to tiddlers work as expected
  let src = `${build}${window.location.hash}`;
  const parentElement = document.getElementById('wiki-frame-parent');
  const iframe = document.createElement('iframe');
  iframe.src = src;
  // see: https://stackoverflow.com/questions/25387977/typescript-iframe-sandbox-property-undefined-domsettabletokenlist-has-no-cons
  (<any>iframe).sandbox = 'allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals';
  // todo: this could be configurable to use a different tw5 build for eg mobile devices / translations, etc
  iframe.name = "sandboxed-wiki";
  iframe.frameBorder = "0"
  iframe.allowFullscreen = true
  parentElement?.appendChild(iframe);
  return iframe;
};

/**
 * Initializes the app.
 */
const initApp = async () => {
  console.log('running initApp')
  const searchParams = parseSearchParams(window.location.search);
  console.log('parsed url search params', searchParams);
  const tiddlybaseConfig: TiddlybaseConfig = await (await fetch(TIDDLYBASE_CONFIG_URL)).json();
  console.log('got tiddlybase config', tiddlybaseConfig);
  const launchConfig: WikiLaunchConfig = getLaunchConfig(searchParams, tiddlybaseConfig);
  console.log('got launch config', launchConfig)
  if (searchParams['signInFlow'] === 'popup') {
    tiddlybaseConfig.authentication.firebaseui.signInFlow = 'popup';
    console.log('overriding sign in flow to be popup');
  }
  const app = initializeApp(tiddlybaseConfig.clientConfig);
  const auth = getAuth(app);
  const ui = new firebaseui.auth.AuthUI(auth);
  const firebaseState: FirebaseState = { app, auth, ui, tiddlybaseConfig, launchConfig };

  let tw5Started = false;

  const startTW5: StartTW5 = async (user: User) => {
    if (tw5Started) {
      console.log("tw5 already started, not starting again")
      return;
    }
    // just in case, remove any previous wiki iframes
    console.log('running startTW5 for user', user);
    const iframe = await createWikiIframe(launchConfig.build);
    if (iframe) {
      const rpc = makeRPC();
      createParentApi(rpc, user, firebaseState, isLocal(searchParams));
      console.log("child iframe created");
      tw5Started = true;
    } else {
      console.log("child iframe could not be created");
    }
  };

  // Listen to change in auth state so it displays the correct UI for when
  // the user is signed in or not.
  auth.onAuthStateChanged(function (user: User | null) {
    console.log('running onAuthStateChanged callback');
    user ? handleSignedInUser(firebaseState, startTW5, user!) : handleSignedOutUser(firebaseState, startTW5);
  });
  // Initialize the FirebaseUI Widget using Firebase.

  // Disable auto-sign in.
  ui.disableAutoSignIn();
};

window.addEventListener('load', initApp);
