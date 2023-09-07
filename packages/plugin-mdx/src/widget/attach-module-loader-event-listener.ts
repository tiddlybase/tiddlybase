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
  ($tw.wiki as any).eventListeners["change"].unshift(mdxModuleLoader._handleWikiChange.bind(mdxModuleLoader));
}
