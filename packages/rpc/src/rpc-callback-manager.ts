import type { MiniIframeRPC } from 'mini-iframe-rpc';
import { CallbackId, CallbackMap, WithCleanupRPC } from './types';
import { AnyFunction } from '@tiddlybase/shared/src/func-fields';


export class RPCCallbackManager {
  rpc: MiniIframeRPC;
  targetWindow: Window;
  targetOrigin: string | null;
  constructor(rpc: MiniIframeRPC,
    targetWindow: Window,
    targetOrigin: string | null = null) {
    this.rpc = rpc
    this.targetWindow = targetWindow;
    this.targetOrigin = targetOrigin;
  }

  generateCallbackId(methodName?: string): CallbackId {
    const parts = [String(crypto.randomUUID())];
    if (methodName) {
      parts.push(methodName)
    }
    return parts.join(".");
  }

  callbackOnce<R>(cb: AnyFunction): CallbackId {
    const callbackId = this.registerMethod((args: any[]) => {
      this.unregisterMethod(callbackId);
      cb.call(null, args);
    });
    return callbackId;
  }

  registerMethod<R>(cb: AnyFunction, methodName?: string): CallbackId {
    const callbackId = this.generateCallbackId(methodName);
    this.rpc.register(callbackId, cb);
    return callbackId;
  }

  unregisterMethod(callbackId: CallbackId) {
    this.rpc.register(callbackId, undefined);
  }

  registerObject<T>(obj: T, methods?: string[]): CallbackMap<T> {
    const methodNames = methods ?? Object.keys(obj as any).filter(key => typeof (obj as any)[key] === 'function');
    return methodNames.reduce((callbackMapAcc, methodName) => {
      callbackMapAcc[methodName as keyof T] = this.registerMethod(((obj[methodName as keyof T]) as Function).bind(obj), methodName);
      return callbackMapAcc;
    }, {} as CallbackMap<T>);
  }

  unregisterObject<T>(callbackMap: CallbackMap<T>) {
    for (let id of Object.values(callbackMap)) {
      this.unregisterMethod(id as string);
    }
  }

  makeStubObject<T>(
    callbackMap: CallbackMap<T>
  ): WithCleanupRPC<Partial<T>> {
    const stub = {
      cleanupRPC: () => this.unregisterObject(callbackMap)
    } as WithCleanupRPC<Partial<T>>;
    for (let [methodName, callbackId] of Object.entries(callbackMap)) {
      (stub as any)[methodName] = (...args: any[]) => this.rpc.invoke(this.targetWindow, this.targetOrigin, callbackId as string, args);
    }
    return stub;
  }
}
