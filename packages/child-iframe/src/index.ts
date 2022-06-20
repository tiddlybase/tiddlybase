import {} from "@tiddlybase/tw5-types/src/index"
import { apiDefiner, makeAPIClient, makeRPC } from "@tiddlybase/rpc";
import { ChildAPI, ParentAPI } from "@tiddlybase/rpc";


const main = async () => {
  const rpc = makeRPC();
  const parentClient = makeAPIClient<ParentAPI>(rpc, window.parent)
  const def = apiDefiner<ChildAPI>(rpc);
  def('testParentChild', async (message:string) => {
    console.log(message);
  });
  const {user, isLocalEnv} = await parentClient('childIframeReady', []);
  console.log('child iframe recevied user info', user);
  const tiddlybase = $tw.tiddlybase ?? {};
  tiddlybase.parentClient = parentClient;
  tiddlybase.isLocalEnv = isLocalEnv;
  $tw.tiddlybase = tiddlybase;
  $tw.boot.boot();
}

window.addEventListener('load', main);
