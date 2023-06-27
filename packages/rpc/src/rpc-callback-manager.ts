import type { MiniIframeRPC } from 'mini-iframe-rpc';

export type CallbackFunction = (args:any[])=>void;

export type CallbackId = string

export class RPCCallbackManager {
  registeredCallbacks: Record<CallbackId, CallbackFunction> = {};
  rpc: MiniIframeRPC;
  constructor(rpc:MiniIframeRPC) {
    this.rpc = rpc
  }

  generateCallbackId():CallbackId {
    return crypto.randomUUID();
  }

  generateMethodName(callbackId: CallbackId):string {
    return `RPCCallbackManager:${callbackId}`;
  }

  callbackOnce(cb:CallbackFunction) {
    const callbackId = this.registerCallback((args:any[]) => {
      this.unregisterCallback(callbackId);
      cb.call(null, args);
    });
  }

  registerCallback(cb:CallbackFunction):CallbackId {
    const callbackId = this.generateCallbackId();
    const methodName = this.generateMethodName(callbackId);
    this.rpc.register(methodName, cb);
    return callbackId;
  }

  unregisterCallback(callbackId:CallbackId) {
    this.rpc.register(this.generateMethodName(callbackId), undefined);
  }
}
