import { MiniIframeRPC } from 'mini-iframe-rpc';
export {ParentAPI} from './parent-api';
export {ChildAPI} from './child-api';

export const makeRPC = () =>
  new MiniIframeRPC({
    defaultInvocationOptions: {
      retryAllFailures: false,
      timeout: 0,
      retryLimit: 0,
    },
  });

// Only preserves fields of an interface which have function type
type FuncFields<T> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any ? T[P] : never;
};

export const makeAPIClient =
  <T>(rpc: MiniIframeRPC, iframe: Window) =>
  <K extends keyof FuncFields<T>>(method: K, args: Parameters<FuncFields<T>[K]>) =>
    rpc.invoke(iframe, null, method as string, args) as ReturnType<FuncFields<T>[K]>;

export const apiDefiner =
  <T>(rpc: MiniIframeRPC) =>
  <K extends keyof FuncFields<T>>(procedureName: K, implementation: FuncFields<T>[K]): void =>
    rpc.register(procedureName as string, implementation);

export type RPCClient<T> = <K extends keyof FuncFields<T>>(method: K, args: Parameters<FuncFields<T>[K]>) => ReturnType<FuncFields<T>[K]>;
