import type { APIDefiner } from "@tiddlybase/rpc";
import type { StorageFileMetadata, TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";
import type { CallableFunctionType } from "@tiddlybase/functions/src/apis";
import { getDownloadURL, getMetadata, getStorage, getBlob, ref } from '@firebase/storage';
import { getFirestore } from '@firebase/firestore';
import { getFunctions, httpsCallable, HttpsCallable, connectFunctionsEmulator } from "@firebase/functions";
import type { Auth } from '@firebase/auth'
import { deleteAccount } from "./login";
import type { FirebaseState, RPC } from "./types";
import { FirebaseStorage } from '@firebase/storage';
import { Functions } from '@firebase/functions'
import { getStorageConfig } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { toggleVisibleDOMSection, replaceChildrenWithText } from "./dom-utils";
import { MergedSources, readTiddlerSources } from "./tiddler-io/tiddler-source";
import { FirestoreTiddlerStore } from "./tiddler-io/firestore-tiddler-store";
import { TiddlyBaseUser } from "@tiddlybase/shared/src/users";

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

const addStorageMethods = (toplevelAPIDefiner: APIDefiner<TopLevelAPIForSandboxedWiki>, storage: FirebaseStorage) => {
  toplevelAPIDefiner('getStorageFileAsBlob', makeGetStorageFileAsBlob(storage));
  toplevelAPIDefiner('getStorageFileMetadata', makeGetStorageFileMetadata(storage));
  toplevelAPIDefiner('getStorageFileDownloadUrl', makeGetStorageFileDownloadUrl(storage));
}

const addAuthMethods = (toplevelAPIDefiner: APIDefiner<TopLevelAPIForSandboxedWiki>, auth: Auth) => {
  toplevelAPIDefiner('authSignOut', auth.signOut.bind(auth));
  toplevelAPIDefiner('authDeleteAccount', deleteAccount);
}

type StubFunction<T extends CallableFunctionType> = HttpsCallable<Parameters<T>, Awaited<ReturnType<T>>>

const getStub = <P extends CallableFunctionType>(functions: Functions, functionName: string): P => {
  const stub: StubFunction<P> = httpsCallable(functions, functionName)
  const invoker = async (request: Parameters<P>[0]): Promise<Awaited<ReturnType<P>>> => {
    const result = await stub(request);
    return result.data as Awaited<ReturnType<P>>;
  };
  return invoker as P;
}

const exposeObjectMethod = (def: APIDefiner<TopLevelAPIForSandboxedWiki>, fn: Parameters<APIDefiner<TopLevelAPIForSandboxedWiki>>[0], obj: Partial<TopLevelAPIForSandboxedWiki>) => {
  if (obj[fn]) {
    def(fn, obj[fn]!.bind(obj));
  }
}

const exposeCallable = (def: APIDefiner<TopLevelAPIForSandboxedWiki>, fn: Parameters<APIDefiner<TopLevelAPIForSandboxedWiki>>[0], functions: Functions) => def(fn, getStub(functions, fn))

export const createParentApi = (rpc: RPC, user: TiddlyBaseUser, firebaseState: FirebaseState, childIframe: Window) => {

  if (firebaseState.tiddlybaseClientConfig.functions) {
    const functions = getFunctions(firebaseState.app, firebaseState.tiddlybaseClientConfig.functions.location);
    if (firebaseState.launchConfig.isLocal) {
      devSetup(functions);
    }

    exposeCallable(rpc.toplevelAPIDefiner, 'addNumbers', functions);
    exposeCallable(rpc.toplevelAPIDefiner, 'notifyAdmin', functions);
  }

  const storage = getStorage(firebaseState.app);
  const firestore = getFirestore(firebaseState.app);

  // only write user data on fresh login, not on reloads
  if (!(user as any).reloadUserInfo) {
    console.log("first login");
    (new FirestoreTiddlerStore(
      firestore,
      "admin",
      "users",
      {
        stripDocIDPrefix: "users/"
      }
    )).setTiddler({
      ...user,
      title: `users/${user.uid}`
    })
  }

  const tiddlerSourcesPromise:Promise<MergedSources> = readTiddlerSources(firebaseState.tiddlybaseClientConfig, firebaseState.launchConfig, user.uid, firebaseState.app, rpc.sandboxedAPIClient);

  rpc.toplevelAPIDefiner('childIframeReady', async () => {

    const { tiddlers, writeStore } = await tiddlerSourcesPromise;

    if (writeStore) {
      exposeObjectMethod(rpc.toplevelAPIDefiner, 'setTiddler', writeStore);
      exposeObjectMethod(rpc.toplevelAPIDefiner,'getTiddler', writeStore);
      exposeObjectMethod(rpc.toplevelAPIDefiner,'deleteTiddler', writeStore);
    }

    return {
      user,
      tiddlers: Object.values(tiddlers),
      wikiInfoConfig: firebaseState.launchConfig.settings,
      storageConfig: getStorageConfig(firebaseState.tiddlybaseClientConfig),
      isLocal: firebaseState.launchConfig.isLocal,
      parentLocation: JSON.parse(JSON.stringify(window.location)),
    }
  });

  addStorageMethods(rpc.toplevelAPIDefiner, storage);
  addAuthMethods(rpc.toplevelAPIDefiner, firebaseState.auth);
  rpc.toplevelAPIDefiner('loadError', async (message: string) => {
    replaceChildrenWithText(document.getElementById("wiki-error-message"), message);
    toggleVisibleDOMSection('wiki-error');
  });
}

