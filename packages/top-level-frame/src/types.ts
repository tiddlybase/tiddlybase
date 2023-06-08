import type MiniIframeRPC from 'mini-iframe-rpc';
import type { APIDefiner} from "@tiddlybase/rpc/src";
import type { APIClient } from "@tiddlybase/rpc/src";
import type { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import type { TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";
import type { TiddlyBaseUser } from '@tiddlybase/shared/src/users';


export type StartTW5 = (user: TiddlyBaseUser) => Promise<void>;

export interface RPC {
  rpc: MiniIframeRPC;
  sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>;
  toplevelAPIDefiner: APIDefiner<TopLevelAPIForSandboxedWiki>;
}
