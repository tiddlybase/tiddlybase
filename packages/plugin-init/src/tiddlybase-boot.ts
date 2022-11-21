import type { } from "@tiddlybase/tw5-types/src/index"
import { apiDefiner, apiClient, makeRPC } from "@tiddlybase/rpc";
import type { TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";
import type { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import { createWikiInfoConfig } from "@tiddlybase/shared/src/wiki-info";
import { loadWikiTiddlers } from "./load-tiddlers";
import { PatchedModules } from "./patched-modules";

(() => {

  // from: https://stackoverflow.com/a/37178303
  const runningIniOSChrome = () => /CriOS/i.test(navigator.userAgent) && /iphone|ipod|ipad/i.test(navigator.userAgent);

  const tiddlerChangeHandler = (wikiChange: $tw.WikiChange) => {
    // for each changed tiddler, invalidate module exports
    for (let m of Object.keys(wikiChange)) {
      ($tw.modules as PatchedModules).clearExports(m);
    }
  };

  const bootTiddlyWiki = () => {

    $tw.modules = new PatchedModules($tw.modules.titles, $tw.modules.types);
    $tw.boot.boot();
    // use unshift() instead of addEventListener beecause the invalidation
    // needs to happen before rerendering of the tiddlers which is initiated
    // by another "change" event listener registered earlier in the boot
    // process
    ($tw.wiki as any).eventListeners["change"].unshift(tiddlerChangeHandler);
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
      try {
        const tiddlers: Array<$tw.TiddlerFields> =
          (await Promise.all(
            wikiNames.map(
              wikiName => loadWikiTiddlers(
                topLevelClient,
                storageConfig,
                wikiName,
                isLocal)))).flat();
        tiddlers.push(createWikiInfoConfig(settings))
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
