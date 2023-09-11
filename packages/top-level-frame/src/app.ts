import type { FirebaseApp } from '@firebase/app';
import type { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import type { TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";
import type { FileDataSource, WritableFileDataSource } from "@tiddlybase/shared/src/file-data-source";
import type { WritableTiddlerDataSource } from "@tiddlybase/shared/src/tiddler-data-source";
import type { LaunchConfig, LaunchParameters, TiddlerDataSourceSpec, TiddlybaseClientConfig } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import type { TiddlyBaseUser } from "@tiddlybase/shared/src/users";
import type { } from '@tiddlybase/tw5-types/src/index';
import type { AuthProvider } from "./auth/auth-provider";
import type { RPC } from './types';

import { initializeApp } from '@firebase/app';
import { Functions, getFunctions } from "@firebase/functions";
import { makeRPC } from "@tiddlybase/rpc/src/make-rpc";
import { RPCCallbackManager } from '@tiddlybase/rpc/src/rpc-callback-manager';
import { apiClient, apiDefiner } from "@tiddlybase/rpc/src/types";
import { mergeConfigDefaults } from "@tiddlybase/shared/src/config-defaults";
import { Lazy, lazy } from "@tiddlybase/shared/src/lazy";
import { parseLaunchParameters } from 'packages/shared/src/launch-parameters';
import { exposeFirebaseFunction, exposeObjectMethod, functionsDevSetup } from './api-utils';
import { getAuthProvider } from "./auth/get-auth-provider";
import { replaceChildrenWithText, toggleVisibleDOMSection } from "./dom-utils";
import { makeFileDataSource } from "./file-data-sources/file-data-source-factory";
import { getNormalizedLaunchConfig } from './launch-config';
import { readTiddlerSources } from "./tiddler-data-sources/tiddler-data-source-factory";


const initRPC = (childIframe: Window): RPC => {
  const rpc = makeRPC();
  return {
    rpc,
    toplevelAPIDefiner: apiDefiner<TopLevelAPIForSandboxedWiki>(rpc),
    sandboxedAPIClient: apiClient<SandboxedWikiAPIForTopLevel>(rpc, childIframe),
    rpcCallbackManager: new RPCCallbackManager(rpc, childIframe)
  };
}

export class TopLevelApp {
  config: TiddlybaseClientConfig;
  tiddlerDataSource?: WritableTiddlerDataSource;
  rpc?: RPC
  launchParameters: LaunchParameters;
  launchConfig: LaunchConfig;
  lazyFirebaseApp: Lazy<FirebaseApp>;
  authProvider: AuthProvider;
  firebaseFunctions?: Functions
  fileDataSource: FileDataSource | WritableFileDataSource | undefined;

  constructor(config: TiddlybaseClientConfig) {
    this.config = mergeConfigDefaults(config);
    this.launchParameters = parseLaunchParameters(
      window.location,
      config.defaultLaunchParameters,
      config.urls?.publicPath);
    this.launchConfig = getNormalizedLaunchConfig(this.config, this.launchParameters);
    // Note: depending on the launchConfig, we might not even need a FirebaseApp instance in the future.
    // This might be good for static websites.
    // TODO: provide helpful error message if firebase is undefined
    this.lazyFirebaseApp = lazy(() => {
      if (this.config.firebase?.clientConfig) {
        return initializeApp(this.config.firebase.clientConfig)
      }
      throw new Error("Could not initialize firebase app object: no client config in tiddlybase config.")
    });
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
      if ('writeFile' in this.fileDataSource) {
        exposeObjectMethod(rpc.toplevelAPIDefiner, 'writeFile', this.fileDataSource);
      }
      if ('deleteFile' in this.fileDataSource) {
        exposeObjectMethod(rpc.toplevelAPIDefiner, 'deleteFile', this.fileDataSource);
      }
    }
  }

  async createParentAPI(rpc: RPC, user: TiddlyBaseUser) {

    const loadError = async (message: string) => {
      replaceChildrenWithText(document.getElementById("wiki-error-message"), message);
      toggleVisibleDOMSection('wiki-error');
    }

    // tiddler and file data sources are initialized in childIframeReady() so the parent frame can
    // listen to the child iframe's RPC request as soon as possible.
    rpc.toplevelAPIDefiner('childIframeReady', async () => {
      try {
        const { tiddlers, writeStore } = await readTiddlerSources(this.launchParameters.instance, this.launchConfig, user.userId, this.lazyFirebaseApp, rpc);
        this.tiddlerDataSource = writeStore;
        this.fileDataSource = makeFileDataSource(rpc, this.lazyFirebaseApp, this.launchParameters.instance, this.launchConfig.files);
        this.exposeDataSourceAPIs(rpc);
        return {
          user,
          tiddlers: Object.values(tiddlers),
          parentLocation: JSON.parse(JSON.stringify(window.location))
        }
      } catch (e: any) {
        let message = e?.message ?? e?.toString() ?? "load error";
        if ('spec' in e) {
          const spec = e.spec as TiddlerDataSourceSpec;
          message += `\nCould not load tiddlers from the following source: ${JSON.stringify(spec)}`;
        }
        loadError(message);
        throw e;
      }
    });

    exposeObjectMethod(rpc.toplevelAPIDefiner, 'signOut', this.authProvider);

    rpc.toplevelAPIDefiner('loadError', loadError);
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
