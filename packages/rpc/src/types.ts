import type { MiniIframeRPC } from 'mini-iframe-rpc';
import {FuncFields} from "@tiddlybase/shared/src/func-fields"

export type WithCleanupRPC<T> = T & {
  cleanupRPC: () => void;
}

export const apiClient =
  <T>(rpc: MiniIframeRPC, iframe: Window) =>
    <K extends keyof FuncFields<T>>(method: K, args: Parameters<FuncFields<T>[K]>) =>
      rpc.invoke(iframe, null, method as string, args) as ReturnType<FuncFields<T>[K]>;

export type APIClient<T> = ReturnType<typeof apiClient<T>>;

export const apiDefiner =
  <T>(rpc: MiniIframeRPC) => <K extends keyof FuncFields<T>>(method: K, implementation: FuncFields<T>[K]): void => rpc.register(method as string, implementation);

export type APIDefiner<T> = ReturnType<typeof apiDefiner<T>>;

export type CallbackId = string

export type CallbackMap<T> = Partial<Record<keyof FuncFields<T>, CallbackId>>
