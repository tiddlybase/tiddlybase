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

/** Api bridge allowing grandparent <-> grandchild iframes to communicate.
Consider the following:


┌────────────────────────────────────────────────────────────┐
│ grandparent iframe with mini-iframe-rpc instance A         │
│                                                            │
| ┌──────────────────────────────────────────────────────┐   |
│ │ child iframe with rpc instance B                     |   |
| |┌────────────────────────────────────────────────────┐|   |
│ │| grandchild iframe w/ rpc instance C                ||   |
| |└────────────────────────────────────────────────────┘|   |
| └──────────────────────────────────────────────────────┘   |
└────────────────────────────────────────────────────────────┘

RPC instance A exposes that can be called by B:

```typescript
interface IB {
  fa1: () => Promise(void),
  fa2: () => Promise(void),
  fa3: () => Promise(void)
}
```

The child iframe can invoke any of the functions in IB. Of these,
fa3 should also be callable from the grandchild iframe. The child iframe also
exposes it's own fb1 function, so the interface callable by C is

```typescript
interface IC {
  fa3: () => Promise(void)
  fb1: () => Promise(void)
}
```

An trivial "fa3" function must be registered in the child iframe's RPC instance
(B), which simply returns the response of the RPC call to A. This is what
bridge() does. To be called in the child iframe:

```typescript
bridge<IB>(rpcB, iframeA, 'fa3')
```

*/

export const apiDefiner =
  <T>(rpc: MiniIframeRPC, prefix: string = "") => <K extends keyof FuncFields<T>>(method: K, implementation: FuncFields<T>[K]): void => rpc.register(`${prefix}${method as string}`, implementation);

export type APIDefiner<T> = ReturnType<typeof apiDefiner<T>>;
