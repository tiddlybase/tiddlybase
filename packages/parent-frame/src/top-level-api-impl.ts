import MiniIframeRPC from "mini-iframe-rpc";
import { apiDefiner } from "@tiddlybase/rpc";
import { TopLevelAPIForWikiSandbox } from "@tiddlybase/rpc/src/top-level-api";
import type { CallableFunctionType} from "@tiddlybase/functions/src/apis";
import {getDownloadURL as _getDownloadURL, getStorage, ref} from '@firebase/storage';
import { getFunctions, httpsCallable, HttpsCallable, connectFunctionsEmulator } from "@firebase/functions";
import { firebaseApp, firebaseAuth, isLocalEnv } from './init';
import type {User} from '@firebase/auth'
import { TiddlyBaseUser, USER_FIELDS } from "@tiddlybase/rpc/src/top-level-api";
import { deleteAccount } from "./login";

const storage = getStorage(firebaseApp);
const functions = getFunctions(firebaseApp, 'europe-west3');

if (isLocalEnv) {
  connectFunctionsEmulator(functions, "localhost", 5001);
}

export const getDownloadURL = async (filename:string) => {
  const fileRef = ref(storage, filename);
  return await _getDownloadURL(fileRef);
};

type StubFunction<T extends CallableFunctionType> = HttpsCallable<Parameters<T>, Awaited<ReturnType<T>>>

const getStub = <P extends CallableFunctionType>(functionName:string):P => {
  const stub:StubFunction<P> = httpsCallable(functions, functionName)
  const invoker =  async (request: Parameters<P>[0]):Promise<Awaited<ReturnType<P>>> => {
    const result = await stub(request);
    return result.data as Awaited<ReturnType<P>>;
  };
  return invoker as P;
}

const objFilter = <K extends keyof any=string,V=any>(fn: (k: K, v: V) => boolean, input: Record<K, V>): Record<K, V> =>
  Object.fromEntries(Object.entries(input).filter(([k, v]) => fn(k as K, v as V))) as Record<K, V>;


const convertUser = (firebaseUser:User):TiddlyBaseUser => objFilter<keyof TiddlyBaseUser, any>((k) => USER_FIELDS.includes(k), firebaseUser) as TiddlyBaseUser;

export const createParentApi = (rpc:MiniIframeRPC, user:User, iframe:Window) => {
  const def = apiDefiner<TopLevelAPIForWikiSandbox>(rpc);
  const exposeCallable = (fn:Parameters<typeof def>[0]) => def(fn, getStub(fn))
  def('childIframeReady', async () => {
    return {
      user: convertUser(user),
      isLocalEnv
    }
  });
  def('getDownloadURL', getDownloadURL);
  def('authSignOut', firebaseAuth.signOut.bind(firebaseAuth));
  def('authDeleteAccount', deleteAccount);
  exposeCallable('addNumbers');
  exposeCallable('notifyAdmin');
}
