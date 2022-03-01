import type {TW} from "@firebase-auth-loader/tw5-types"
import type { ParentAPI, RPCClient } from "@firebase-auth-loader/rpc/src";

export interface ExtendedTW extends TW {
  parentClient?: RPCClient<ParentAPI>
  parentLocation: Partial<Location>
}
