import type { ParentAPI, RPCClient } from "@firebase-auth-loader/rpc/src";

export type TWTiddlybase = Partial<{
  parentClient: RPCClient<ParentAPI>
  parentLocation: Partial<Location>
  inSandboxedIframe: boolean
  isLocalEnv: boolean
}>;
