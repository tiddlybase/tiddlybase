import type { } from "@tiddlybase/tw5-types/src/index"
import { apiDefiner, apiClient } from "@tiddlybase/rpc";
import { makeRPC } from "@tiddlybase/rpc/src/make-rpc";
import type { TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";
import type { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import { createWikiInfoConfig } from "@tiddlybase/shared/src/wiki-info";
import { PatchedModules } from "./patched-modules";

(() => {

  // from: https://stackoverflow.com/a/37178303
  const runningIniOSChrome = () => /CriOS/i.test(navigator.userAgent) && /iphone|ipod|ipad/i.test(navigator.userAgent);

  const bootTiddlyWiki = () => {

    $tw.modules = new PatchedModules($tw.modules.titles, $tw.modules.types);
    $tw.boot.boot();
    if (runningIniOSChrome()) {
      window.onerror = null;
    }
  }

  /**
   * The @tiddlybase/init plugin should only be part of wikis which are loaded
   * as iframes by Tiddlybase. If the current window isn't an iframe, the plugin
   * should exit.
   */
  const inSandboxedIframe = window !== window.parent;

  // Prior to even loading preboot.js, ensure `supressBoot`
  // and other necessary variables are set.
  window.$tw = {
    boot: {
      suppressBoot: true,
    } as typeof $tw.boot,
  } as typeof $tw;

  window.addEventListener('load', async () => {

    if (inSandboxedIframe) {
      const rpc = makeRPC();
      const topLevelClient = apiClient<TopLevelAPIForSandboxedWiki>(rpc, window.parent)
      const def = apiDefiner<SandboxedWikiAPIForTopLevel>(rpc);
      def('testParentChild', async (message: string) => {
        console.log(message);
      });
      const topLevelResponse = await topLevelClient('childIframeReady', []);
      const {
        user,
        tiddlers,
        storageConfig,
        parentLocation,
        wikiInfoConfig,
        isLocal
      } = topLevelResponse;
      console.log('child iframe received user info', topLevelResponse);
      window.$tw.tiddlybase = {
        topLevelClient,
        parentLocation,
        user,
        storageConfig,
        rpc,
        isLocal
      };
      try {
        tiddlers.push(createWikiInfoConfig(wikiInfoConfig))
        $tw.preloadTiddlerArray(tiddlers);
        bootTiddlyWiki();
      } catch (e) {
        console.dir(e);
        if (typeof e === 'object') {
          await topLevelClient('loadError', [(e as any)?.message]);
        } else {
          await topLevelClient('loadError', [String(e)]);
        }
      }
    } else { // !inSandboxedIframe
      bootTiddlyWiki();
    }

  });

})()
