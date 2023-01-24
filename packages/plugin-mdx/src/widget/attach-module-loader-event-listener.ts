import type { } from "@tiddlybase/tw5-types/src/index";
import { mdxModuleLoader } from './global';
import { ModuleSet } from "./mdx-module-loader";
import { getTransitiveMDXModuleConsumers } from "./module-utils";

export const name = "load-calendar-events-on-startup";
export const platforms = ["browser"];
export const after = ['startup'];
export const synchronous = true;
export const startup = () => {

  // use unshift() instead of addEventListener because the invalidation
  // needs to happen before rerendering of the tiddlers which is initiated
  // by another "change" event listener registered earlier in the boot
  // process (and thus closer to the head of the wiki.eventListeners array).
  ($tw.wiki as any).eventListeners["change"].unshift(async (wikiChange: $tw.WikiChange) => {
    // invalidate modified / deleted tiddlers from compilationResults cache.
    const toInvalidateSet = await Object.keys(wikiChange).reduce(async (moduleSetPromise, changedTiddler) => {
      const moduleSet = await moduleSetPromise;
      if (await mdxModuleLoader.hasModule(changedTiddler)) {
        await getTransitiveMDXModuleConsumers(changedTiddler, mdxModuleLoader, moduleSet);
      }
      return moduleSet;
    }, Promise.resolve(new Set<string>([])) as Promise<ModuleSet>);
    toInvalidateSet.forEach(tiddler => {
      mdxModuleLoader.invalidateModule(tiddler)
    });
  });

}
