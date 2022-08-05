import type { } from "@tiddlybase/tw5-types/src/index"
import { apiDefiner, apiClient, makeRPC } from "@tiddlybase/rpc";
import type { TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";
import type { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import { createWikiInfoConfig } from "@tiddlybase/shared/src/wiki-info";
import { loadWikiTiddlers } from "./load-tiddlers";

(() => {

  /**
   * The @tiddlybase/init plugin should only be part of wikis which are loaded
   * as iframes by Tiddlybase. If the current window isn't an iframe, the plugin
   * should exit.
   */
  if (window === window.parent) {
    return;
  }

  // Prior to even loading preboot.js, ensure `supressBoot`
  // and other necessary variables are set.
  window.$tw = {
    boot: {
      suppressBoot: true
    } as typeof $tw.boot,
  } as typeof $tw;

  window.addEventListener('load', async () => {

    const rpc = makeRPC();
    const topLevelClient = apiClient<TopLevelAPIForSandboxedWiki>(rpc, window.parent)
    const def = apiDefiner<SandboxedWikiAPIForTopLevel>(rpc);
    def('testParentChild', async (message: string) => {
      console.log(message);
    });
    const topLevelResponse = await topLevelClient('childIframeReady', []);
    const {
      user,
      launchConfig: { wikiNames, settings },
      isLocal,
      storageConfig,
      parentLocation
    } = topLevelResponse;
    console.log('child iframe received user info', topLevelResponse);
    window.$tw.tiddlybase = {
      topLevelClient,
      isLocal,
      parentLocation,
      user,
      storageConfig
    };
    const tiddlers: Array<$tw.TiddlerFields> =
      (await Promise.all(
        wikiNames.map(
          wikiName => loadWikiTiddlers(
            topLevelClient,
            storageConfig,
            wikiName,
            isLocal)))).flat();
    tiddlers.push(createWikiInfoConfig(settings))
    console.log("tiddlers", tiddlers);
    $tw.preloadTiddlerArray(tiddlers);
    $tw.boot.boot();
  });

})()
