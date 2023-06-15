import { apiClient, apiDefiner } from "@tiddlybase/rpc/src";
import type { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import type { TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";
import type { TiddlerStore } from "@tiddlybase/shared/src/tiddler-store";
import type { LaunchConfig, TiddlybaseClientConfig } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { makeRPC } from "@tiddlybase/rpc/src/make-rpc";
import { ParsedSearchParams } from "@tiddlybase/shared/src/search-params";
import { lazy, Lazy } from "@tiddlybase/shared/src/lazy";
import { getNormalizedLaunchConfig } from './launch-config';
import { createParentApi } from './top-level-api-impl';
import { initializeApp } from '@firebase/app'
import { RPC } from './types';
import type { } from '@tiddlybase/tw5-types/src/index'
import { TiddlyBaseUser } from "@tiddlybase/shared/src/users";
import { toggleVisibleDOMSection } from "./dom-utils";
import { FirebaseApp } from '@firebase/app'
import { getAuthProvider } from "./auth/get-auth-provider";

const initRPC = (childIframe: Window): RPC => {
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

  getIframeURL(): string {
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

  loadWiki(user: TiddlyBaseUser, lazyFirebaseApp: Lazy<FirebaseApp>) {
    const iframe = this.createWikiIframe(this.getIframeURL());
    this.rpc = initRPC(iframe);
    createParentApi(this.rpc, user, lazyFirebaseApp, this.config, this.launchConfig);
  }


  initApp() {
    // TODO: depending on the launchConfig, we might not even need a
    // FirebaseApp instance in the future.
    const lazyFirebaseApp: Lazy<FirebaseApp> = lazy(() => initializeApp(this.config.firebaseClientConfig));
    const authProvider = getAuthProvider(lazyFirebaseApp, this.launchConfig)

    authProvider.onLogin((user, _authDetails) => {
      toggleVisibleDOMSection('user-signed-in');
      this.loadWiki(user, lazyFirebaseApp);
    });

    authProvider.onLogout(() => {
      toggleVisibleDOMSection('user-signed-out');
    });

  };
};
