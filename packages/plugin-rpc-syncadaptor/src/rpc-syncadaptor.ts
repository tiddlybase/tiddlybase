import type { } from "@tiddlybase/tw5-types/src/index";
import { apiDefiner } from "@tiddlybase/rpc/src/types";
import type { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import { TiddlerStorageChangeListener } from "@tiddlybase/shared/src/tiddler-storage";

export class RPCSyncadaptor implements $tw.SyncAdaptor, TiddlerStorageChangeListener {

  name = "RPCSyncadaptor";
  supportsLazyLoading = false;
  wiki: $tw.Wiki;


  constructor({wiki = globalThis.$tw.wiki}:{wiki?: $tw.Wiki} = {}) {
    this.wiki = wiki
    this.registerRPCMethods();
  }

  private registerRPCMethods() {
    if (globalThis.$tw.tiddlybase?.rpc) {
      const def = apiDefiner<SandboxedWikiAPIForTopLevel>(globalThis.$tw.tiddlybase.rpc);
      def('onSetTiddler', (tiddler: $tw.TiddlerFields) => this.onSetTiddler(tiddler));
      def('onDeleteTiddler', (title: string) => this.onDeleteTiddler(title));
    }
  }

  onSetTiddler(tiddler: $tw.TiddlerFields): void {
    this.wiki.addTiddler(tiddler);
    // update syncer change count to wiki change count, since this change is coming from the server, so the tiddler isn't 'dirty'.
    const changeCount = globalThis.$tw.wiki.getChangeCount(tiddler.title) ?? 0;
    if (!(tiddler.title in globalThis.$tw.syncer.tiddlerInfo)) {
      globalThis.$tw.syncer.tiddlerInfo[tiddler.title] = {
        adaptorInfo: {bag: undefined},
        changeCount
      };
    } else {
      globalThis.$tw.syncer.tiddlerInfo[tiddler.title].changeCount = changeCount;
    }
  }

  onDeleteTiddler(title: string): void {
    this.wiki.deleteTiddler(title);
  }

  deleteTiddler(title: string, callback: $tw.Callback, options: { tiddlerInfo: { adaptorInfo: $tw.SyncAdaptorTiddlerInfo } }): void {
    // console.log("deleteTiddler (sandboxed)", title);
    globalThis.$tw.tiddlybase?.topLevelClient?.('deleteTiddler', [title]).then(
      result => callback(null, result),
      err => callback(err)
    );
  }

  isReady(): boolean {
    return true;
  }
  loadTiddler(title: string, callback: $tw.Callback): void {
    // TODO: unimplemented
  }
  saveTiddler(tiddler: $tw.Tiddler, callback: $tw.Callback): void {
    // console.log("saveTiddler (sandboxed)", tiddler);
    globalThis.$tw.tiddlybase?.topLevelClient?.('setTiddler', [tiddler.fields]).then(
      result => callback(null, result),
      err => callback(err)
    );
  }
  getTiddlerInfo(tiddler: $tw.Tiddler): $tw.SyncAdaptorTiddlerInfo | undefined {
    return {
      bag: tiddler.fields.bag
    };
  }

  getTiddlerRevision(title: string): string | undefined {
    var tiddler = this.wiki.getTiddler(title);
    return tiddler?.fields.revision;
  };
}


// conditionally enable syncadaptor if running in browser
export const adaptorClass = $tw.browser ? RPCSyncadaptor : undefined;
