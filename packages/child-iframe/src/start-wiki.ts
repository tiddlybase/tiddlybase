import {} from "@tiddlybase/tw5-types/src/index"
import { apiDefiner, apiClient, makeRPC } from "@tiddlybase/rpc";
import type { TopLevelAPIForWikiSandbox } from "@tiddlybase/rpc/src/top-level-api";
import type { WikiSandboxAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-apis";


const main = async () => {
  const rpc = makeRPC();
  const topLevelClient = apiClient<TopLevelAPIForWikiSandbox>(rpc, window.parent)
  const def = apiDefiner<WikiSandboxAPIForTopLevel>(rpc);
  def('testParentChild', async (message:string) => {
    console.log(message);
  });
  const {user, isLocalEnv} = await topLevelClient('childIframeReady', []);
  console.log('child iframe recevied user info', user);
  const tiddlybase = $tw.tiddlybase ?? {};
  tiddlybase.topLevelClient = topLevelClient;
  tiddlybase.isLocalEnv = isLocalEnv;
  $tw.tiddlybase = tiddlybase;
  $tw.boot.boot();
}

window.addEventListener('load', main);
