/// <reference types="./tw5" />

declare namespace $tw {

  export type TWTiddlybase = Partial<{
    topLevelClient: import("@tiddlybase/rpc/src/types").APIClient<import("@tiddlybase/rpc/src/top-level-api").TopLevelAPIForSandboxedWiki>
    rpc: import("mini-iframe-rpc").MiniIframeRPC;
    rpcCallbackManager: import("@tiddlybase/rpc/src/rpc-callback-manager").RPCCallbackManager;
    isLocal: boolean
  }>;

  // tiddlybase extension
  export let tiddlybase: undefined | TWTiddlybase
}
