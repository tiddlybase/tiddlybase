import type { ParentAPI, RPCClient } from "@tiddlybase/rpc/src";

export type TWTiddlybase = Partial<{
  parentClient: RPCClient<ParentAPI>
  parentLocation: Partial<Location>
  inSandboxedIframe: boolean
  isLocalEnv: boolean
}>;
