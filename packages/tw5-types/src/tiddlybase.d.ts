/// <reference types="./tw5" />

declare namespace $tw {

  export interface StorageConfig {
    filesPath:string,
    wikisPath:string
  }

  export type TWTiddlybase = Partial<{
    topLevelClient: import("@tiddlybase/rpc").APIClient<import("@tiddlybase/rpc/src/top-level-api").TopLevelAPIForSandboxedWiki>
    rpc: import("mini-iframe-rpc").MiniIframeRPC;
    isLocal: boolean,
    user: import("@tiddlybase/rpc/src/top-level-api").TiddlyBaseUser,
    parentLocation: Partial<Location>,
    storageConfig: StorageConfig
  }>;

  export interface WikiInfoConfig {
    // === TiddlyBase additions ===
    // relative path of external files referenced by embed-media plugin.
    "default-local-file-location": string,
    // prefix for relative URLs considered external files which are part of the
    // wiki, hosted on google storage or the local file filesystem (for TiddlyDesktop).
    "external-url-path-prefix": string,
    // 'display-link-icons' - if true, display file type icon when files are
    // linked to instead of embedded.
    "display-link-icons": boolean
  }

  // tiddlybase extension
  export let tiddlybase: undefined | TWTiddlybase
}
