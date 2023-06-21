import type { APIDefiner } from "@tiddlybase/rpc";
import type { TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";
import type { CallableFunctionType } from "@tiddlybase/functions/src/apis";
import { httpsCallable, HttpsCallable, connectFunctionsEmulator } from "@firebase/functions";
import { Functions } from '@firebase/functions';

export const functionsDevSetup = (functions: Functions, emulatorHost:string, emulatorPort:number) => connectFunctionsEmulator(functions, emulatorHost, emulatorPort);

export type StubFunction<T extends CallableFunctionType> = HttpsCallable<Parameters<T>, Awaited<ReturnType<T>>>

export const getStub = <P extends CallableFunctionType>(functions: Functions, functionName: string): P => {
  const stub: StubFunction<P> = httpsCallable(functions, functionName)
  const invoker = async (request: Parameters<P>[0]): Promise<Awaited<ReturnType<P>>> => {
    const result = await stub(request);
    return result.data as Awaited<ReturnType<P>>;
  };
  return invoker as P;
}

export const exposeObjectMethod = (def: APIDefiner<TopLevelAPIForSandboxedWiki>, fn: Parameters<APIDefiner<TopLevelAPIForSandboxedWiki>>[0], obj: Partial<TopLevelAPIForSandboxedWiki>) => {
  if (obj[fn]) {
    def(fn, obj[fn]!.bind(obj));
  }
}

export const exposeFirebaseFunction = (def: APIDefiner<TopLevelAPIForSandboxedWiki>, fn: Parameters<APIDefiner<TopLevelAPIForSandboxedWiki>>[0], functions: Functions) => def(fn, getStub(functions, fn))
