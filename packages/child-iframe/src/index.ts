import { apiDefiner, makeAPIClient, makeRPC } from "@firebase-auth-loader/rpc";
import { ChildAPI, ParentAPI,  } from "@firebase-auth-loader/rpc";
import type {} from "@firebase-auth-loader/tw5-types"


const main = async () => {
  const rpc = makeRPC();
  const parentClient = makeAPIClient<ParentAPI>(rpc, window.parent)
  const def = apiDefiner<ChildAPI>(rpc);
  def('testParentChild', async (message:string) => {
    console.log(message);
  });
  const {isLocalEnv} = await parentClient('childIframeReady', []);
  $tw.tiddlybase = $tw.tiddlybase ?? {};
  $tw.tiddlybase.parentClient = parentClient;
  $tw.tiddlybase.isLocalEnv = isLocalEnv;
  $tw.boot.boot();
}

window.addEventListener('load', main);
