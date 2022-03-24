import MiniIframeRPC from "mini-iframe-rpc";
import { apiDefiner, ParentAPI } from "@tiddlybase/rpc";
import type { CallableFunctionType} from "@tiddlybase/functions/src/apis";
import {getDownloadURL as _getDownloadURL, getStorage, ref} from '@firebase/storage';
import { getFunctions, httpsCallable, HttpsCallable, connectFunctionsEmulator } from "@firebase/functions";
import { firebaseApp, isLocalEnv } from './init';
import {User} from '@firebase/auth'

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

export const createParentApi = (rpc:MiniIframeRPC, user:User, iframe:Window) => {
  // const childClient = makeAPIClient<ChildAPI>(rpc, iframe);
  const def = apiDefiner<ParentAPI>(rpc);
  const exposeCallable = (fn:Parameters<typeof def>[0]) => def(fn, getStub(fn))
  def('childIframeReady', async () => {
    return {
      userName: user.displayName!,
      isLocalEnv
    }
  });
  def('getDownloadURL', getDownloadURL);
  exposeCallable('addNumbers');
  exposeCallable('notifyAdmin');
}
