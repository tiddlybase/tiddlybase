import type { } from "@tiddlybase/tw5-types/src/index"
import { apiDefiner, apiClient, makeRPC } from "@tiddlybase/rpc";
import type { TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";
import type { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import { getWikiName } from "@tiddlybase/webshared/src/search-params";
import { createWikiInfoConfig } from "@tiddlybase/webshared/src/wiki-info";

(() => {

  // Prior to even loading preboot.js, ensure `supressBoot`
  // and other necessary variables are set.
  const inSandboxedIframe = window !== window.parent
  window.$tw = {
    boot: {
      suppressBoot: true
    } as typeof $tw.boot,
    tiddlybase: {
      inSandboxedIframe
    }
  } as typeof $tw;

  window.addEventListener('load', async () => {

    // non-sandboxed and sandboxed but local dev scenario loads wiki json
    // from same location as wiki build
    let wikiContentJSONUrl:string;
    let tiddlers: Array<$tw.TiddlerFields> = [];

    if (inSandboxedIframe) {
      const rpc = makeRPC();
      const topLevelClient = apiClient<TopLevelAPIForSandboxedWiki>(rpc, window.parent)
      const def = apiDefiner<SandboxedWikiAPIForTopLevel>(rpc);
      def('testParentChild', async (message: string) => {
        console.log(message);
      });
      const { user, wikiSettings, wikiName, isLocal } = await topLevelClient('childIframeReady', []);
      console.log('child iframe received user info', {user, wikiSettings, wikiName, isLocal});
      Object.assign(window.$tw.tiddlybase!, {topLevelClient, isLocal});
      if (isLocal) {
        // sandboxed iframe, local development
        wikiContentJSONUrl = `${wikiName}.json`
      } else {
        // sandboxed iframe, load wiki content from storage (production case)
        const wikiContentsPath = `${wikiSettings?.['default-storage-prefix']}/${wikiName}.json`
        // TODO: firebase storage error handling
        wikiContentJSONUrl = await topLevelClient('getDownloadURL', [wikiContentsPath]);
      }
      // create wikiInfoConfig tiddler
      tiddlers.push(createWikiInfoConfig(wikiSettings))
    } else {
      // non-sandboxed case means build was loaded into browser directly
      wikiContentJSONUrl = `${getWikiName()}.json`;
    }
    console.log("loading tiddlers from", wikiContentJSONUrl);
    tiddlers = tiddlers.concat(await (await fetch(wikiContentJSONUrl)).json());
    // TODO: fetch() error handling
    $tw.preloadTiddlerArray(tiddlers);
    $tw.boot.boot();
  });

})()
