import type MiniIframeRPC from 'mini-iframe-rpc';
import type { APIDefiner} from "@tiddlybase/rpc/src/types";
import type { APIClient } from "@tiddlybase/rpc/src/types";
import type { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import type { TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";
import { RPCCallbackManager } from '@tiddlybase/rpc/src/rpc-callback-manager';

export interface RPC {
  rpc: MiniIframeRPC;
  sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>;
  toplevelAPIDefiner: APIDefiner<TopLevelAPIForSandboxedWiki>;
  rpcCallbackManager: RPCCallbackManager
}
