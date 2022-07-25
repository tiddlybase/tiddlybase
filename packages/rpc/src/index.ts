import { MiniIframeRPC } from 'mini-iframe-rpc';

export const makeRPC = () =>
  new MiniIframeRPC({
    defaultInvocationOptions: {
      retryAllFailures: false,
      timeout: 0,
      retryLimit: 0,
    },
  });

type AnyFunction = (...args: any[]) => any;

// Only preserves fields of an interface which have function type
type FuncFields<T> = {
  [P in keyof T]: T[P] extends AnyFunction ? T[P] : never;
};

export const apiClient =
  <T>(rpc: MiniIframeRPC, iframe: Window, prefix: string = "") =>
    <K extends keyof FuncFields<T>>(method: K, args: Parameters<FuncFields<T>[K]>) =>
      rpc.invoke(iframe, null, `${prefix}${method as string}`, args) as ReturnType<FuncFields<T>[K]>;

export type APIClient<T> = ReturnType<typeof apiClient<T>>;

export const apiDefiner =
  <T>(rpc: MiniIframeRPC, prefix: string = "") => <K extends keyof FuncFields<T>>(method: K, implementation: FuncFields<T>[K]): void => rpc.register(`${prefix}${method as string}`, implementation);

export type APIDefiner<T> = ReturnType<typeof apiDefiner<T>>;
