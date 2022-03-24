import { apiDefiner, makeAPIClient, makeRPC } from "@tiddlybase/rpc";
import { ChildAPI, ParentAPI,  } from "@tiddlybase/rpc";
import type {} from "@tiddlybase/tw5-types"


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
