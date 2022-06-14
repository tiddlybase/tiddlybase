/// <reference types="./tw5" />

declare namespace $tw {
  export type TWTiddlybase = Partial<{
    parentClient: import("@tiddlybase/rpc").RPCClient<import("@tiddlybase/rpc").ParentAPI>
    parentLocation: Partial<Location>
    inSandboxedIframe: boolean
    isLocalEnv: boolean
  }>;

  // tiddlybase extension
  export let tiddlybase: undefined | TWTiddlybase
}
