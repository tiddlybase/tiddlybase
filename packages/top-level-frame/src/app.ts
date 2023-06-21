import type { FirebaseApp } from '@firebase/app';
import { initializeApp } from '@firebase/app';
import { Functions, getFunctions } from "@firebase/functions";
import { apiClient, apiDefiner } from "@tiddlybase/rpc/src";
import { makeRPC } from "@tiddlybase/rpc/src/make-rpc";
import type { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import type { TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";
import { FileDataSource } from "@tiddlybase/shared/src/file-data-source";
import { Lazy, lazy } from "@tiddlybase/shared/src/lazy";
import { ParsedSearchParams } from "@tiddlybase/shared/src/search-params";
import type { WritableTiddlerDataSource } from "@tiddlybase/shared/src/tiddler-data-source";
import type { LaunchConfig, TiddlybaseClientConfig } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { TiddlyBaseUser } from "@tiddlybase/shared/src/users";
import type { } from '@tiddlybase/tw5-types/src/index';
import { exposeFirebaseFunction, exposeObjectMethod, functionsDevSetup } from './api-utils';
import type { AuthProvider } from "./auth/auth-provider";
import { getAuthProvider } from "./auth/get-auth-provider";
import { replaceChildrenWithText, toggleVisibleDOMSection } from "./dom-utils";
import { makeFileDataSource } from "./file-data-sources/file-data-source-factory";
import { getNormalizedLaunchConfig } from './launch-config';
import { readTiddlerSources } from "./tiddler-data-sources/tiddler-data-source-factory";
import { RPC } from './types';

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
  tiddlerDataSource?: WritableTiddlerDataSource;
  rpc?: RPC
  searchParams: ParsedSearchParams;
  launchConfig: LaunchConfig;
  lazyFirebaseApp: Lazy<FirebaseApp>;
  authProvider: AuthProvider;
  firebaseFunctions?: Functions
  fileDataSource: FileDataSource | undefined;

  constructor(config: TiddlybaseClientConfig, searchParams: ParsedSearchParams) {
    this.config = config;
    this.searchParams = searchParams;
    this.launchConfig = getNormalizedLaunchConfig(this.searchParams, this.config);
    // Note: depending on the launchConfig, we might not even need a FirebaseApp instance in the future.
    // This might be good for static websites.
    this.lazyFirebaseApp = lazy(() => initializeApp(this.config.firebaseClientConfig));
    this.authProvider = getAuthProvider(this.lazyFirebaseApp, this.launchConfig)
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

  async loadWiki(user: TiddlyBaseUser) {
    const iframe = this.createWikiIframe(this.getIframeURL());
    this.rpc = initRPC(iframe);
    await this.createParentAPI(this.rpc, user);
  }

  initFirebaseFunctions(rpc: RPC) {
    if (this.launchConfig.functions) {
      let region: string | undefined = undefined;
      if (this.launchConfig.functions.endpoint?.type === 'production') {
        region = this.launchConfig.functions.endpoint.region
      }
      this.firebaseFunctions = getFunctions(this.lazyFirebaseApp(), region);
      if (this.launchConfig.functions.endpoint?.type === 'development') {
        functionsDevSetup(
          this.firebaseFunctions,
          this.launchConfig.functions.endpoint.emulatorHost,
          this.launchConfig.functions.endpoint.emulatorPort);
      }
      // expose functions
      // expose firebase functions to sandboxed iframe
      // TODO: make the list of functions to expose configurable
      exposeFirebaseFunction(rpc.toplevelAPIDefiner, 'addNumbers', this.firebaseFunctions);
      exposeFirebaseFunction(rpc.toplevelAPIDefiner, 'notifyAdmin', this.firebaseFunctions);
    }
  }

  exposeDataSourceAPIs(rpc: RPC) {
    // expose tiddler data source interface functions
    if (this.tiddlerDataSource) {
      exposeObjectMethod(rpc.toplevelAPIDefiner, 'setTiddler', this.tiddlerDataSource);
      exposeObjectMethod(rpc.toplevelAPIDefiner, 'getTiddler', this.tiddlerDataSource);
      exposeObjectMethod(rpc.toplevelAPIDefiner, 'deleteTiddler', this.tiddlerDataSource);
    }

    // expose file data source interface functions
    if (this.fileDataSource) {
      exposeObjectMethod(rpc.toplevelAPIDefiner, 'readFile', this.fileDataSource);
    }
  }

  async createParentAPI(rpc: RPC, user: TiddlyBaseUser) {

    // tiddler and file data sources are initialized in childIframeReady() so the parent frame can
    // listen to the child iframe's RPC request as soon as possible.
    rpc.toplevelAPIDefiner('childIframeReady', async () => {
      const { tiddlers, writeStore } = await readTiddlerSources(this.config.instanceName, this.launchConfig, user.userId, this.lazyFirebaseApp, rpc.sandboxedAPIClient);
      this.tiddlerDataSource = writeStore;
      this.fileDataSource = makeFileDataSource(this.lazyFirebaseApp, this.config.instanceName, this.launchConfig.files);
      this.exposeDataSourceAPIs(rpc);
      return {
        user,
        tiddlers: Object.values(tiddlers),
        wikiInfoConfig: this.launchConfig.wikiInfoConfig,
        parentLocation: JSON.parse(JSON.stringify(window.location))
      }
    });

    exposeObjectMethod(rpc.toplevelAPIDefiner, 'signOut', this.authProvider);

    rpc.toplevelAPIDefiner('loadError', async (message: string) => {
      replaceChildrenWithText(document.getElementById("wiki-error-message"), message);
      toggleVisibleDOMSection('wiki-error');
    });
  }


  initApp() {

    if (this.rpc) {
      this.initFirebaseFunctions(this.rpc);
    }

    this.authProvider.onLogin((user, _authDetails) => {
      toggleVisibleDOMSection('user-signed-in');
      this.loadWiki(user);
    });

    this.authProvider.onLogout(() => {
      toggleVisibleDOMSection('user-signed-out');
    });

  };
};
