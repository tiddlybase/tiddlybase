import {} from "@tiddlybase/tw5-types/src/index"
import { apiDefiner, apiClient, makeRPC } from "@tiddlybase/rpc";
import type { TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";
import type { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";


const main = async () => {
  const rpc = makeRPC();
  const topLevelClient = apiClient<TopLevelAPIForSandboxedWiki>(rpc, window.parent)
  const def = apiDefiner<SandboxedWikiAPIForTopLevel>(rpc);
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
