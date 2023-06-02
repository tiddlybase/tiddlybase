import MiniIframeRPC from "mini-iframe-rpc";
import { apiClient, apiDefiner } from "@tiddlybase/rpc";
import { StorageFileMetadata, TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";
import { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import type { CallableFunctionType } from "@tiddlybase/functions/src/apis";
import { getDownloadURL, getMetadata, getStorage, getBlob, ref } from '@firebase/storage';
import { getFirestore } from '@firebase/firestore';
import { getFunctions, httpsCallable, HttpsCallable, connectFunctionsEmulator } from "@firebase/functions";
import type { User } from '@firebase/auth'
import { TiddlyBaseUser, USER_FIELDS } from "@tiddlybase/rpc/src/top-level-api";
import { deleteAccount } from "./login";
import { FirebaseAPIs, FirebaseState } from "./types";
import { FirebaseStorage } from '@firebase/storage';
import { Functions } from '@firebase/functions'
import { getStorageConfig } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { objFilter } from "@tiddlybase/shared/src/obj-filter";
import { toggleVisibleDOMSection, replaceChildrenWithText } from "./dom-utils";
import { MergedSources, readTiddlerSources } from "./tiddler-io/tiddler-source";
import { FirestoreTiddlerStore } from "./tiddler-io/firestore-tiddler-store";

export const devSetup = (functions: Functions) => connectFunctionsEmulator(functions, "localhost", 5001);

const makeGetStorageFileDownloadUrl = (storage: FirebaseStorage) => async (filename: string): Promise<string> => {
  const fileRef = ref(storage, filename);
  return await getDownloadURL(fileRef);
};

const makeGetStorageFileAsBlob = (storage: FirebaseStorage) => async (filename: string): Promise<Blob> => {
  const fileRef = ref(storage, filename);
  return await getBlob(fileRef);
};

const makeGetStorageFileMetadata = (storage: FirebaseStorage) => async (filename: string): Promise<StorageFileMetadata> => {
  const fileRef = ref(storage, filename);
  const metadata = await getMetadata(fileRef);
  return {
    contentType: metadata.contentType,
    name: metadata.name,
    timeCreated: metadata.timeCreated,
    timeUpdated: metadata.updated,
    size: metadata.size,
    md5Hash: metadata.md5Hash
  }
};

type StubFunction<T extends CallableFunctionType> = HttpsCallable<Parameters<T>, Awaited<ReturnType<T>>>

const getStub = <P extends CallableFunctionType>(functions: Functions, functionName: string): P => {
  const stub: StubFunction<P> = httpsCallable(functions, functionName)
  const invoker = async (request: Parameters<P>[0]): Promise<Awaited<ReturnType<P>>> => {
    const result = await stub(request);
    return result.data as Awaited<ReturnType<P>>;
  };
  return invoker as P;
}

const convertUser = (firebaseUser: User): TiddlyBaseUser => objFilter<keyof TiddlyBaseUser, any>((k) => USER_FIELDS.includes(k), firebaseUser) as TiddlyBaseUser;

export const createParentApi = (rpc: MiniIframeRPC, user: User, firebaseState: FirebaseState, childIframe: Window) => {
  const apis: FirebaseAPIs = {};
  const def = apiDefiner<TopLevelAPIForSandboxedWiki>(rpc);

  const exposeObjectMethod = (fn: Parameters<typeof def>[0], obj: Partial<TopLevelAPIForSandboxedWiki>) => {
    if (obj[fn]) {
      def(fn, obj[fn]!.bind(obj));
    }
  }

  if (firebaseState.tiddlybaseClientConfig.functions) {
    apis.functions = getFunctions(firebaseState.app, firebaseState.tiddlybaseClientConfig.functions.location);
    if (firebaseState.launchConfig.isLocal) {
      devSetup(apis.functions);
    }
    const exposeCallable = (fn: Parameters<typeof def>[0]) => def(fn, getStub(apis.functions!, fn))
    exposeCallable('addNumbers');
    exposeCallable('notifyAdmin');
  }

  apis.storage = getStorage(firebaseState.app);
  apis.firestore = getFirestore(firebaseState.app);

  // only write user data on fresh login, not on reloads
  if (!(user as any).reloadUserInfo) {
    console.log("first login");
    (new FirestoreTiddlerStore(
      apis.firestore,
      "admin",
      "users",
      {
        stripDocIDPrefix: "users/"
      }
    )).setTiddler({
      title: `users/${user.uid}`,
      displayName: user.displayName,
      photo: user.photoURL,
      email: user.email,
      emailVerified: user.emailVerified,
      providers: user.providerData.map(p => p.providerId)
    })
  }

  const sandboxedAPIClient = apiClient<SandboxedWikiAPIForTopLevel>(rpc, childIframe);
  const tiddlerSourcesPromise:Promise<MergedSources> = readTiddlerSources(firebaseState.tiddlybaseClientConfig, firebaseState.launchConfig, user.uid, apis, sandboxedAPIClient);

  def('childIframeReady', async () => {

    const { tiddlers, writeStore } = await tiddlerSourcesPromise;

    if (writeStore) {
      exposeObjectMethod('setTiddler', writeStore);
      exposeObjectMethod('getTiddler', writeStore);
      exposeObjectMethod('deleteTiddler', writeStore);
    }

    return {
      user: convertUser(user),
      tiddlers: Object.values(tiddlers),
      wikiInfoConfig: firebaseState.launchConfig.settings,
      storageConfig: getStorageConfig(firebaseState.tiddlybaseClientConfig),
      isLocal: firebaseState.launchConfig.isLocal,
      parentLocation: JSON.parse(JSON.stringify(window.location)),
    }
  });

  def('getStorageFileAsBlob', makeGetStorageFileAsBlob(apis.storage));
  def('getStorageFileMetadata', makeGetStorageFileMetadata(apis.storage));
  def('getStorageFileDownloadUrl', makeGetStorageFileDownloadUrl(apis.storage));
  def('authSignOut', firebaseState.auth.signOut.bind(firebaseState.auth));
  def('authDeleteAccount', deleteAccount);
  def('loadError', async (message: string) => {
    replaceChildrenWithText(document.getElementById("wiki-error-message"), message);
    toggleVisibleDOMSection('wiki-error');
  });
}

