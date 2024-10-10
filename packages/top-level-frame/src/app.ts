import type { } from '@tiddlybase/tw5-types/src/index';
import type { FirebaseApp } from '@firebase/app';
import type { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import type { TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";
import type { WikiViewState } from "@tiddlybase/shared/src/wiki-view-state";
import type { ReadOnlyFileStorage, FileStorage } from "@tiddlybase/shared/src/file-storage";
import type { TiddlerStorage } from "@tiddlybase/shared/src/tiddler-storage";
import type { LaunchConfig, LaunchParameters, TiddlerStorageSpec, TiddlybaseClientConfig } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import type { TiddlyBaseUser } from "@tiddlybase/shared/src/users";
import type { AuthDetails, AuthProvider } from "@tiddlybase/shared/src/auth-provider";
import type { RPC } from './types';

import { initializeApp } from '@firebase/app';
import { Functions, getFunctions } from "@firebase/functions";
import { makeRPC } from "@tiddlybase/rpc/src/make-rpc";
import { RPCCallbackManager } from '@tiddlybase/rpc/src/rpc-callback-manager';
import { apiClient, apiDefiner } from "@tiddlybase/rpc/src/types";
import { mergeConfigDefaults } from "@tiddlybase/shared/src/config-defaults";
import { Lazy, lazy } from "@tiddlybase/shared/src/lazy";
import { parseLaunchParameters } from './launch-parameters';
import { exposeFirebaseFunction, exposeObjectMethod, functionsDevSetup } from './api-utils';
import { getAuthProvider } from "./auth/get-auth-provider";
import { replaceChildrenWithText, toggleVisibleDOMSection } from "./dom-utils";
import { makeFileStorage } from "./file-storage/file-storage-factory";
import { getNormalizedLaunchConfig } from './launch-config';
import { readTiddlerSources } from "./tiddler-storage/tiddler-storage-factory";
import { TIDDLYBASE_TITLE_AUTH_DETAILS, TIDDLYBASE_TITLE_LAUNCH_PARAMETERS, TIDDLYBASE_TITLE_PARENT_LOCATION, TIDDLYBASE_TITLE_PATH_TEMPLATE, TIDDLYBASE_TITLE_TIDDLER_PROVENANCE, TIDDLYBASE_TITLE_TIDDLER_SOURCES, TIDDLYBASE_TITLE_USER_PROFILE } from "@tiddlybase/shared/src/constants";
import { OptionallyEnabledChangeListenerWrapper, makeChangeListener, makeFilteringChangeListener } from './change-listener';
import { createURL } from 'packages/shared/src/path-template-utils';

import { getVertexAI, getGenerativeModel, GenerativeModel } from "firebase/vertexai-preview";
import { writeFirestoreDoc } from './firebase-utils';
import { makeInstanceConfiguration,  instanceConfigurationPath, instanceConfigurationTitle, instanceConfigSchemaName} from "@tiddlybase/shared/src/permissions";

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
  tiddlywikiBootComplete = false;
  config: TiddlybaseClientConfig;
  tiddlerStorage?: TiddlerStorage;
  rpc?: RPC;
  tiddlerStorageChangeListener?: OptionallyEnabledChangeListenerWrapper;
  launchParameters: LaunchParameters;
  launchConfig: LaunchConfig;
  lazyFirebaseApp: Lazy<FirebaseApp>;
  authProvider: AuthProvider;
  firebaseFunctions?: Functions
  fileStorage: ReadOnlyFileStorage | FileStorage | undefined;
  model?: GenerativeModel

  constructor(config: TiddlybaseClientConfig) {
    const { tiddlybaseConfig, defaultLaunchParameters } = mergeConfigDefaults(config, window.location.hostname);
    this.config = tiddlybaseConfig;
    this.launchParameters = parseLaunchParameters(
      window.location,
      this.config.urls?.pathTemplate!,
      defaultLaunchParameters);
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
    this.authProvider = getAuthProvider(this.launchParameters, this.launchConfig, this.lazyFirebaseApp);
  }

  getIframeURL(): string {
    return `${this.launchConfig.build}${window.location.hash}`;
  }

  destroyWikiFrame() {
    const container = document.getElementById('wiki-frame-parent');
    [...(container?.getElementsByTagName('iframe') ?? [])].forEach(iframe => {
      container?.removeChild(iframe);
    })
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

  attachDOMEventListeners() {
    window.addEventListener("popstate", event => {
      this.tiddlerStorageChangeListener?.onSetTiddler({
        wikiViewState: event.state,
        text: window.location.href,
        title: TIDDLYBASE_TITLE_PARENT_LOCATION
      })
    });
  }

  async loadWiki(user?: TiddlyBaseUser, authDetails?: AuthDetails) {
    const iframe = this.createWikiIframe(this.getIframeURL());
    this.rpc = initRPC(iframe);
    this.tiddlerStorageChangeListener = makeChangeListener(this.rpc.sandboxedAPIClient);
    this.attachDOMEventListeners()
    await this.createParentAPI(this.rpc, user, authDetails);
  }

  // TODO: this isn't called right now, but we'll want to support firebase
  // functions again in the future!
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

  exposeStorageAPIs(rpc: RPC) {
    // expose tiddler data source interface functions
    if (this.tiddlerStorage) {
      exposeObjectMethod(rpc.toplevelAPIDefiner, 'setTiddler', this.tiddlerStorage);
      exposeObjectMethod(rpc.toplevelAPIDefiner, 'getTiddler', this.tiddlerStorage);
      exposeObjectMethod(rpc.toplevelAPIDefiner, 'deleteTiddler', this.tiddlerStorage);
    }

    // expose file data source interface functions
    if (this.fileStorage) {
      exposeObjectMethod(rpc.toplevelAPIDefiner, 'readFile', this.fileStorage);
      if ('writeFile' in this.fileStorage) {
        exposeObjectMethod(rpc.toplevelAPIDefiner, 'writeFile', this.fileStorage);
      }
      if ('deleteFile' in this.fileStorage) {
        exposeObjectMethod(rpc.toplevelAPIDefiner, 'deleteFile', this.fileStorage);
      }
    }
  }

  exposeGemini(rpc: RPC, lazyFirebaseApp: Lazy<FirebaseApp>) {
    //  based on: https://firebase.google.com/docs/vertex-ai/get-started?platform=web&hl=en&authuser=0#add-sdk
    rpc.rpc.register('generateCompletion', async (prompt:string) : Promise<string> => {
      if (!this.model) {
        const vertexAI = getVertexAI(lazyFirebaseApp());

        // Initialize the generative model with a model that supports your use case
        // Gemini 1.5 models are versatile and can be used with all API capabilities
        this.model = getGenerativeModel(vertexAI, { model: "gemini-1.5-flash" });
      }
      try {
        const result = await this.model!.generateContent(prompt);
        const response = result.response;
        return response.text();
      } catch (e) {
        throw Error((e as Error).message);
      }
    });
  }

  async createParentAPI(rpc: RPC, user?: TiddlyBaseUser, authDetails?: AuthDetails) {

    const loadError = async (message: string) => {
      replaceChildrenWithText(document.getElementById("wiki-error-message"), message);
      toggleVisibleDOMSection('wiki-error');
    }

    const displayLoginScreen = async () => {
      toggleVisibleDOMSection('login');
    }

    rpc.toplevelAPIDefiner('tiddlywikiBootComplete', async () => {
      this.tiddlywikiBootComplete = true;
      if (this.tiddlerStorageChangeListener) {
        this.tiddlerStorageChangeListener.enable(true);
      }
    });

    // tiddler and file data sources are initialized in childIframeReady() so the parent frame can
    // listen to the child iframe's RPC request as soon as possible.
    rpc.toplevelAPIDefiner('childIframeReady', async () => {
      try {
        const { tiddlers, writeStore, provenance, sourcesWithSpecs } = await readTiddlerSources(
          this.launchParameters,
          this.launchConfig,
          this.lazyFirebaseApp,
          rpc.rpcCallbackManager,
          makeFilteringChangeListener(this.tiddlerStorageChangeListener!));
        this.tiddlerStorage = writeStore;
        this.fileStorage = makeFileStorage(this.launchParameters, rpc, this.lazyFirebaseApp, this.launchConfig.files);
        this.exposeStorageAPIs(rpc);
        this.exposeGemini(rpc, this.lazyFirebaseApp)
        return {
          tiddlers: [
            ...Object.values(tiddlers),
            {
              "tiddler-sources": sourcesWithSpecs.filter(x => x).map(s => ({sourceIndex: s!.sourceIndex, spec: s!.spec})),
              title: TIDDLYBASE_TITLE_TIDDLER_SOURCES,
            },
            { // TODO: update provenance value when it's contents changes!
              provenance,
              title: TIDDLYBASE_TITLE_TIDDLER_PROVENANCE,
            },
            {
              ...user,
              title: TIDDLYBASE_TITLE_USER_PROFILE,
            },
            {
              ...authDetails,
              title: TIDDLYBASE_TITLE_AUTH_DETAILS,
            },
            {
              text: window.location.href,
              title: TIDDLYBASE_TITLE_PARENT_LOCATION
            },
            {
              ...this.launchParameters,
              title: TIDDLYBASE_TITLE_LAUNCH_PARAMETERS
            },
            {
              pathTemplate: this.config.urls!.pathTemplate,
              title: TIDDLYBASE_TITLE_PATH_TEMPLATE
            }
          ]
        }
      } catch (e: any) {
        let message = e?.message ?? e?.toString() ?? "load error";
        if ('spec' in e) {
          const spec = e.spec as TiddlerStorageSpec;
          message += `\nCould not load tiddlers from the following source: ${JSON.stringify(spec)}`;
        }
        loadError(message);
        throw e;
      }
    });

    exposeObjectMethod(rpc.toplevelAPIDefiner, 'signOut', this.authProvider);
    rpc.toplevelAPIDefiner('createInstance', async (instanceName:string):Promise<boolean> => {
      await writeFirestoreDoc(
        this.lazyFirebaseApp,
        this.launchParameters,
        instanceConfigurationPath(instanceName),
        {
          ...(makeInstanceConfiguration(instanceName, this.launchParameters.userId!)),
          schema: instanceConfigSchemaName,
          title: instanceConfigurationTitle(instanceName)
        }
      )
      return true;
    });
    rpc.toplevelAPIDefiner('loadError', loadError);
    rpc.toplevelAPIDefiner('loginScreen', displayLoginScreen);
    rpc.toplevelAPIDefiner('changeURL', async (
        wikiViewState:WikiViewState,
        pathVariables: Record<string, string>,
        searchVariables?: Record<string, string>,
        hash?: string
      ) => {
        // don't allow launchConfig and instance to be specified
        const {launchConfig: _1, instance: _2, ...safePathVariables} = pathVariables;
        const newURL = createURL(
          this.config.urls?.pathTemplate!,
          window.location.href,
          safePathVariables,
          searchVariables,
          hash
        );
        console.log("pushState", wikiViewState);
        window.history.pushState(wikiViewState, '', newURL);
        return newURL
      });

  }

  private onAuthChange(user?: TiddlyBaseUser, authDetails?: AuthDetails) {
    this.launchParameters.userId = user?.userId;
    this.tiddlywikiBootComplete = false;
    if (this.rpc) {
      // wiki has been loaded
      this.rpc.rpc.close();
      this.destroyWikiFrame()
    }
    this.loadWiki(user, authDetails).then(() => {
      toggleVisibleDOMSection('wiki-container');
    })
  }


  initApp() {
    console.log("launchParameters", this.launchParameters, "launchConfig", this.launchConfig);
    this.authProvider.onLogin((user, authDetails) => {
      this.onAuthChange(user, authDetails);
    });

    this.authProvider.onLogout(() => {
      this.onAuthChange();
    });

  };
};
