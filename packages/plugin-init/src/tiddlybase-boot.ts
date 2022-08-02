import type { } from "@tiddlybase/tw5-types/src/index"
import { apiDefiner, apiClient, makeRPC } from "@tiddlybase/rpc";
import type { TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";
import type { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";

(() => {

  // Prior to even loading preboot.js, ensure `supressBoot`
  // and other necessary variables are set.
  const inSandboxedIframe = window !== window.parent
  window.$tw = {
    boot: {
      suppressBoot: true
    } as typeof $tw.boot,
    tiddlybase: {
      inSandboxedIframe,
      parentLocation: inSandboxedIframe ? JSON.parse(window.name) : window.location
    }
  } as typeof $tw;

  const wikiSearchParams:Record<string, string>  = Object.fromEntries((new URLSearchParams(window.$tw?.tiddlybase?.parentLocation?.search)).entries());

  if (window.$tw?.tiddlybase) {
    window.$tw.tiddlybase.isLocalEnv = wikiSearchParams['local_wiki'] === 'true';
  }

  window.addEventListener('load', async () => {
    let tiddlers:Array<$tw.TiddlerFields> = [];

  if (inSandboxedIframe) {
    // set window.name to a more human-friendly name
      window.name = "sandboxed-wiki"
      const rpc = makeRPC();
      const topLevelClient = apiClient<TopLevelAPIForSandboxedWiki>(rpc, window.parent)
      const def = apiDefiner<SandboxedWikiAPIForTopLevel>(rpc);
      def('testParentChild', async (message: string) => {
        console.log(message);
      });
      const { user, wikiSettings, wikiName } = await topLevelClient('childIframeReady', []);
      console.log('child iframe received user info', user, wikiSettings, wikiName);

      window.$tw.tiddlybase!.topLevelClient = topLevelClient;

      console.log("loading tiddlers");
      const wikiContentsPath = `${wikiSettings?.['default-storage-prefix']}/${wikiName}.json`
      const wikiContentJSONUrl = await topLevelClient('getDownloadURL', [wikiContentsPath]);
      tiddlers = await (await fetch(wikiContentJSONUrl)).json();

  } else {
    // if not in sandboxed iframe, then the wiki html is viewed outside of tiddlybase
    // TODO: load tiddlers
  }
  $tw.preloadTiddlerArray(tiddlers);
  $tw.boot.boot();
});

})()
