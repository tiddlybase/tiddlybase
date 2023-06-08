import { apiClient, apiDefiner } from "@tiddlybase/rpc/src";
import type { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import type { TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";
import type { TiddlerStore } from "@tiddlybase/shared/src/tiddler-store";
import type { LaunchConfig, TiddlybaseClientConfig } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { makeRPC } from "@tiddlybase/rpc/src/make-rpc";
import { ParsedSearchParams } from "@tiddlybase/shared/src/search-params";
import { getNormalizedLaunchConfig } from './launch-config';
import { createParentApi } from './top-level-api-impl';
import { initializeApp } from '@firebase/app'
import { RPC, StartTW5 } from './types';
import type { } from '@tiddlybase/tw5-types/src/index'
import { TiddlyBaseUser } from "@tiddlybase/shared/src/users";
import { toggleVisibleDOMSection } from "./dom-utils";
import { addFirebaseUI, writeUserProfile } from "./auth/firebaseui-utils";
import { FirebaseAuthProvider } from "./auth/firebase-auth-provider";

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
    const firebaseApp = initializeApp(this.config.clientConfig);
    const authProvider = new FirebaseAuthProvider(firebaseApp);
    addFirebaseUI(authProvider, '#firebaseui-container', this.config.authentication.firebaseui)

    const startTW5: StartTW5 = async (user: TiddlyBaseUser) => {
      // just in case, remove any previous wiki iframes
      console.log('running startTW5 for user', user);
      const iframe = this.createWikiIframe(this.getIframeURL());
      if (iframe) {
        this.rpc = initRPC(iframe);
        createParentApi(this.rpc, user, firebaseApp, this.config, this.launchConfig);
        console.log("child iframe created");
      } else {
        console.log("child iframe could not be created");
      }
    };

    authProvider.onLogin((user, authDetails) => {
      toggleVisibleDOMSection('user-signed-in');
      if (!authDetails.lastLogin) {
        writeUserProfile(firebaseApp, user);
      }
      startTW5(user);
    });
    authProvider.onLogout(() => {
      toggleVisibleDOMSection('user-signed-out');
    });

    // Disable auto-sign in.
    // ui.disableAutoSignIn();
  };
};
