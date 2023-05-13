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
import { FirebaseState } from "./types";
import { FirebaseStorage } from '@firebase/storage';
import { Functions } from '@firebase/functions'
import { getStorageConfig } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { toggleVisibleDOMSection, replaceChildrenWithText } from "./dom-utils";
import { FirestoreTiddlerStore } from "./firestore-tiddler-store";

export const devSetup = (functions: Functions) => connectFunctionsEmulator(functions, "localhost", 5001);

const makeGetStorageFileDownloadUrl = (storage: FirebaseStorage) => async (filename: string):Promise<string> => {
  const fileRef = ref(storage, filename);
  return await getDownloadURL(fileRef);
};

const makeGetStorageFileAsBlob = (storage: FirebaseStorage) => async (filename: string):Promise<Blob> => {
  const fileRef = ref(storage, filename);
  return await getBlob(fileRef);
};

const makeGetStorageFileMetadata = (storage: FirebaseStorage) => async (filename: string):Promise<StorageFileMetadata> => {
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

const objFilter = <K extends keyof any = string, V = any>(fn: (k: K, v: V) => boolean, input: Record<K, V>): Record<K, V> =>
  Object.fromEntries(Object.entries(input).filter(([k, v]) => fn(k as K, v as V))) as Record<K, V>;

const convertUser = (firebaseUser: User): TiddlyBaseUser => objFilter<keyof TiddlyBaseUser, any>((k) => USER_FIELDS.includes(k), firebaseUser) as TiddlyBaseUser;

export const createParentApi = (rpc: MiniIframeRPC, user: User, firebaseState: FirebaseState, isLocal: boolean, childIframe?: Window) => {
  const def = apiDefiner<TopLevelAPIForSandboxedWiki>(rpc);

  const exposeObjectMethod = (fn: Parameters<typeof def>[0], obj:Partial<TopLevelAPIForSandboxedWiki>) => {
    if (obj[fn]) {
      def(fn, obj[fn]!.bind(obj));
    }
  }

  if (firebaseState.tiddlybaseConfig.functions) {
    const functions = getFunctions(firebaseState.app, firebaseState.tiddlybaseConfig.functions.location);
    if (isLocal) {
      devSetup(functions);
    }
    const exposeCallable = (fn: Parameters<typeof def>[0]) => def(fn, getStub(functions, fn))
    exposeCallable('addNumbers');
    exposeCallable('notifyAdmin');
  }

  const storage = getStorage(firebaseState.app);

  if (childIframe) {
    const firestore = getFirestore(firebaseState.app);
    const sandboxedAPIClient = apiClient<SandboxedWikiAPIForTopLevel>(rpc, childIframe);
    // TODO: derive wikiName from launchConfig
    const wikiName = 'default';
    const firestoreTiddlerStore = new FirestoreTiddlerStore(firestore, sandboxedAPIClient, firebaseState.tiddlybaseConfig.name, wikiName);
    exposeObjectMethod('setTiddler', firestoreTiddlerStore);
    exposeObjectMethod('getTiddler', firestoreTiddlerStore);
    exposeObjectMethod('deleteTiddler', firestoreTiddlerStore);
  }


  def('childIframeReady', async () => {
    return {
      user: convertUser(user),
      launchConfig: firebaseState.launchConfig,
      storageConfig: getStorageConfig(firebaseState.tiddlybaseConfig),
      parentLocation: JSON.parse(JSON.stringify(window.location)),
      isLocal
    }
  });

  def('getStorageFileAsBlob', makeGetStorageFileAsBlob(storage));
  def('getStorageFileMetadata', makeGetStorageFileMetadata(storage));
  def('getStorageFileDownloadUrl', makeGetStorageFileDownloadUrl(storage));
  def('authSignOut', firebaseState.auth.signOut.bind(firebaseState.auth));
  def('authDeleteAccount', deleteAccount);
  def('loadError', async (message: string) => {
    replaceChildrenWithText(document.getElementById("wiki-error-message"), message);
    toggleVisibleDOMSection('wiki-error');
  });
}
