import type { } from "@tiddlybase/tw5-types/src/index";
import { mdxModuleLoader } from './global';
export const name = "load-calendar-events-on-startup";
export const platforms = ["browser"];
export const after = ["startup"];
export const before = ["render"];
export const synchronous = true;

export const startup = () => {
  // use unshift() instead of addEventListener because the invalidation
  // needs to happen before rerendering of the tiddlers which is initiated
  // by another "change" event listener registered earlier in the boot
  // process (and thus closer to the head of the wiki.eventListeners array).
  ($tw.wiki as any).eventListeners["change"].unshift((wikiChange: $tw.WikiChange) => {
    // invalidate modified / deleted tiddlers from compilationResults cache.
    Object.keys(wikiChange).forEach(tiddler => {
      // NOTE: this module previously used getTransitiveMDXModuleConsumers()
      // from "./module-utils" to do transitive module invalidation. The problem
      // was that this was an async operation, and the tiddlywiki event listeners
      // are invoked in a loop - synchronously. This meant the invalidation
      // occurred later than the mdxModuleLoader.getModuleExports() call, so a
      // stale version of the module was returned.
      // Better to have non-transitive invalidation than disfunctional invalidation.
      // Also, naively implementing the transitive invalidation introduces a
      // race condition between the recompilation of the previously invalidated
      // module and async transitive invalidation of it's dependencies.
      mdxModuleLoader.invalidateModule(tiddler)
    });
  });

}
