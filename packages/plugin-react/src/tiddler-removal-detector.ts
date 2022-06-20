import type {} from "@tiddlybase/tw5-types/src/index"

/**
 * tiddler-removal-detector
 * This module addresses the problem of React Root garbage collection.
 * React needs to be notified if it should no longer try to monitor a dom
 * subtree for changes. Ideally, when a Tiddlywiki widget's DOM element is no
 * longer needed, React would be notified. Unfortunately, Tiddlywiki isn't
 * guaranteed to call any Widget class methods when a widget's DOM element is
 * removed from the DOM, which can happen for several reasons:
 * - The tiddler containing the widget is closed and removed from the Story.
 * - The parent widget's refresh() function decides to build a new DOM element.
 *   For example, this happens when the a transcluded tiddler changes.
 * - The parent widget gets rid of the child widget (eg: a <$list> filtering
 *   by tag would remove the widget if its parent tiddler loses that tag).
 * - A react widget's component tree might remove the parent element of a
 *   transcluded tiddler (added via the TranscludeTiddler component).
 * - There can be additional reasons in the non-story parts of the UI (eg:
 *   sidebar, edit template, ...)
 *
 * There is the `tm-close-tiddler` message for the closing tiddler case, but
 * that doesn't all the cases listed above, and it's not fired when all tiddler
 * are closed.
 *
 * # Naive solution
 * The simplest approach is to monitory all subtree changes on document.body.
 * This does work, the downside is that each React root must be checked whether
 * it has become an orphan on any subtree change. This places a limit on the
 * number of react widgets which can be displayed at any time.
 *
 * # Slightly more complex solution
 * If we accept that react widgets should only exist within the story, then
 * we could have a single mutation observer which listens to direct child
 * changes of the <section> element at the root of the story widget. This can
 * be used to detect when a tiddler is removed from the story. We also need a
 * per-tiddler mutation observer wich **does** listen to subtree changes (albeit
 * with a much smaller scope) to cover cases where the tiddler remains open but
 * the DOM element is replaced by the widget (eg: refresh, transclude, ...).
 */

import { findNavigator } from '@tiddlybase/plugin-tiddlybase-utils/src/navigator';
import type {} from "@tiddlybase/tw5-types/src/index"


let _isInstalled = false;

export type RemovalHandler = (event: $tw.Widget.WidgetEvent) => void;

// monitoredElement -> [callback]
let registeredCallbacks: Record<string, RemovalHandler[]> = {};

export const monitorRemoval = (tiddlerTitle: string, callback: RemovalHandler) => {
  console.log(`monitoring ${tiddlerTitle} for removal`)
  registeredCallbacks[tiddlerTitle] = (registeredCallbacks[tiddlerTitle] ?? []).concat(callback);
}

export const unmonitorRemoval = (tiddlerTitle: string) => {
  delete registeredCallbacks[tiddlerTitle];
}

export const isInstalled = () => _isInstalled;

const dispatchAndRemove = <T extends $tw.Widget.WidgetEvent>(tiddlerTitles: string[], event: T) => {
  console.log(`dispatching removal event for`, tiddlerTitles);
  for (let title of tiddlerTitles) {
    for (let callback of registeredCallbacks[title] ?? []) {
      callback(event);
    }
    unmonitorRemoval(title);
  }
}

export const install = () => {
  if (isInstalled()) {
    console.log("already installed, doing nothing");
    return;
  }
  const navigator = findNavigator();
  if (navigator) {
    console.log("removal detector: install()");
    // we should use addEventListeners(), but we don't have a
    // typescript type for that function yet.
    const originalHandleCloseAllTiddlerEvent = navigator.eventListeners["tm-close-all-tiddlers"];
    navigator.addEventListener("tm-close-all-tiddlers", function (this:any, event: $tw.Widget.CloseAllTiddlersEvent) {
      dispatchAndRemove(Object.keys(registeredCallbacks), event);
      originalHandleCloseAllTiddlerEvent?.call(this, event);
      return true;
    });
    const originalHandleCloseTiddlerEvent = navigator.eventListeners["tm-close-tiddler"];
    navigator.addEventListener("tm-close-tiddler", function (this:any, event:$tw.Widget.CloseTiddlerEvent) {
      dispatchAndRemove([event.tiddlerTitle!], event);
      originalHandleCloseTiddlerEvent?.call(this, event);
      return true;
    });
    const originalHandleCloseOtherTiddlersEvent = navigator.eventListeners["tm-close-other-tiddlers"];
    navigator.addEventListener("tm-close-other-tiddlers", function (this:any, event:$tw.Widget.CloseOtherTiddlersEvent) {
      dispatchAndRemove(Object.keys(registeredCallbacks).filter(t => t !== event.tiddlerTitle), event);
      originalHandleCloseOtherTiddlersEvent?.call(this, event);
      return true;
    });
    _isInstalled = true;
  }
}

// no uninstall() since there is no Widget.removeEventListener().
