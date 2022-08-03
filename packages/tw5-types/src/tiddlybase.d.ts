/// <reference types="./tw5" />

declare namespace $tw {
  export type TWTiddlybase = Partial<{
    topLevelClient: import("@tiddlybase/rpc").APIClient<import("@tiddlybase/rpc/src/top-level-api").TopLevelAPIForSandboxedWiki>
    inSandboxedIframe: boolean,
    isLocal: boolean
  }>;

  // tiddlybase extension
  export let tiddlybase: undefined | TWTiddlybase
}
