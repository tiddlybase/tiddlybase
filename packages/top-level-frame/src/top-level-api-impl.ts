import MiniIframeRPC from "mini-iframe-rpc";
import { apiDefiner } from "@tiddlybase/rpc";
import { TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";
import type { CallableFunctionType } from "@tiddlybase/functions/src/apis";
import { getDownloadURL as _getDownloadURL, getStorage, ref } from '@firebase/storage';
import { getFunctions, httpsCallable, HttpsCallable, connectFunctionsEmulator } from "@firebase/functions";
import type { User } from '@firebase/auth'
import { TiddlyBaseUser, USER_FIELDS } from "@tiddlybase/rpc/src/top-level-api";
import { deleteAccount } from "./login";
import { FirebaseState } from "./types";
import { FirebaseStorage } from '@firebase/storage';
import { Functions } from '@firebase/functions'

export const devSetup = (functions: Functions) => connectFunctionsEmulator(functions, "localhost", 5001);

export const getDownloadURL = (storage: FirebaseStorage) => async (filename: string) => {
  const fileRef = ref(storage, filename);
  return await _getDownloadURL(fileRef);
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

export const createParentApi = (rpc: MiniIframeRPC, user: User, firebaseState: FirebaseState, isLocal: boolean) => {
  const def = apiDefiner<TopLevelAPIForSandboxedWiki>(rpc);

  if (firebaseState.tiddlybaseConfig.functions) {
    const functions = getFunctions(firebaseState.app, firebaseState.tiddlybaseConfig.functions.location);
    if (isLocal) {
      devSetup(functions);
    }
    const exposeCallable = (fn: Parameters<typeof def>[0]) => def(fn, getStub(functions, fn))
    exposeCallable('addNumbers');
    exposeCallable('notifyAdmin');
  }

  def('childIframeReady', async () => {
    return {
      user: convertUser(user),
      launchConfig: firebaseState.launchConfig,
      storageConfig: firebaseState.tiddlybaseConfig.storage,
      parentLocation: JSON.parse(JSON.stringify(window.location)),
      isLocal
    }
  });
  def('getDownloadURL', getDownloadURL(getStorage(firebaseState.app)));
  def('authSignOut', firebaseState.auth.signOut.bind(firebaseState.auth));
  def('authDeleteAccount', deleteAccount);
}
