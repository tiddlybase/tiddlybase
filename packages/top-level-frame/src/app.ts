import { apiClient, apiDefiner } from "@tiddlybase/rpc/src";
import type { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import type { TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";
import type { TiddlerStore } from "@tiddlybase/shared/src/tiddler-store";
import type { LaunchConfig, TiddlybaseClientConfig } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { makeRPC } from "@tiddlybase/rpc/src/make-rpc";
import { ParsedSearchParams } from "@tiddlybase/shared/src/search-params";
import { getNormalizedLaunchConfig } from './launch-config';

import { User } from '@firebase/auth';
import { handleSignedInUser, handleSignedOutUser } from './login';
import { createParentApi } from './top-level-api-impl';
import { initializeApp } from '@firebase/app'
import { getAuth } from '@firebase/auth'
import * as firebaseui from 'firebaseui';
import { FirebaseState, RPC, StartTW5 } from './types';
import type { } from '@tiddlybase/tw5-types/src/index'

const initRPC = (childIframe: Window):RPC => {
  const rpc = makeRPC();
  return {
    rpc,
    toplevelAPIDefiner: apiDefiner<TopLevelAPIForSandboxedWiki>(rpc),
    sandboxedAPIClient: apiClient<SandboxedWikiAPIForTopLevel>(rpc, childIframe)
  };
}

export class TopLevelApp {
  config: TiddlybaseClientConfig;
  tiddlerStore?: TiddlerStore;
  rpc?: RPC
  searchParams: ParsedSearchParams;
  launchConfig: LaunchConfig;

  constructor(config: TiddlybaseClientConfig, searchParams: ParsedSearchParams) {
    this.config = config;
    this.searchParams = searchParams;
    this.launchConfig = getNormalizedLaunchConfig(this.searchParams, this.config);
  }

  getIframeURL():string {
    return `${this.launchConfig.build}${window.location.hash}`;
  }

  createWikiIframe(iframeURL: string): Window {
    // append URL fragment so permalinks to tiddlers work as expected
    let src = iframeURL;
    const parentElement = document.getElementById('wiki-frame-parent');
    const iframe = document.createElement('iframe');
    iframe.src = src;
    // see: https://stackoverflow.com/questions/25387977/typescript-iframe-sandbox-property-undefined-domsettabletokenlist-has-no-cons
    (<any>iframe).sandbox = 'allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals';
    iframe.name = "sandboxed-wiki";
    iframe.frameBorder = "0"
    iframe.allowFullscreen = true
    parentElement?.appendChild(iframe);
    return iframe.contentWindow!;
  };


  initApp () {
    if (this.searchParams['signInFlow'] === 'popup') {
      this.config.authentication.firebaseui.signInFlow = 'popup';
      console.log('overriding sign in flow to be popup');
    }
    const app = initializeApp(this.config.clientConfig);
    const auth = getAuth(app);
    const ui = new firebaseui.auth.AuthUI(auth);
    const firebaseState: FirebaseState = { app, auth, ui, tiddlybaseClientConfig: this.config, launchConfig: this.launchConfig };

    let tw5Started = false;

    const startTW5: StartTW5 = async (user: User) => {
      if (tw5Started) {
        console.log("tw5 already started, not starting again")
        return;
      }
      // just in case, remove any previous wiki iframes
      console.log('running startTW5 for user', user);
      const iframe = this.createWikiIframe(this.getIframeURL());
      if (iframe) {
        this.rpc = initRPC(iframe);
        createParentApi(this.rpc, user, firebaseState, iframe!);
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
};
