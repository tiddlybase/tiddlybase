/**
 * dom-removal-detector
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


export type MonitorCallback = (orphanNode: Node) => void;

// monitoredElement -> callback
let callbackMap = new Map<HTMLElement, MonitorCallback>();

let observer: MutationObserver | undefined;

const isOrphan = (testNode: Node, removedNode:Node): boolean => {
  // a node is an orphan if
  // - it's parentNode is null
  // - is a child of the freshly removed node.

  if (!testNode?.parentNode || testNode?.parentNode === removedNode) {
    return true;
  }
  // If parent is body, this node is still in the DOM.
  // TODO: test this on fragments, if fragment's parent was removed,
  // this could be a false heuristic.
  if (testNode.parentNode.constructor.name === 'HTMLBodyElement') {
    return false;
  }
  // otherwise, it's an orphan if it's parent is an orphan.
  return isOrphan(testNode.parentNode, removedNode);
}

export const monitorRemoval = (monitoredElement: HTMLElement, callback: MonitorCallback) => {
  callbackMap.set(monitoredElement, callback);
}

export const unmonitorRemoval = (monitoredElement: HTMLElement) => {
  callbackMap.delete(monitoredElement);
}

const maybeRemove = (removedNode: Node) => {
  // naive strategy: for each monitored element, see if the
  // removed node was a parent.
  callbackMap.forEach((callback: MonitorCallback, monitoredElement: HTMLElement) => {
    if (isOrphan(monitoredElement, removedNode)) {
      callback(removedNode);
      unmonitorRemoval(monitoredElement);
    }
  })
}

export const isInstalled = () => !!observer;

export const install = (document: Document) => {
  if (isInstalled()) {
    console.log("already installed, doing nothing");
    return;
  }
  // based on https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

  // Options for the observer (which mutations to observe)
  const config: MutationObserverInit = { attributes: false, childList: true, subtree: true, characterData: false };

  // Callback function to execute when mutations are observed
  const callback: MutationCallback = (mutationsList, observer) => {
    for (const mutation of mutationsList) {
      if (mutation.removedNodes) {
        mutation.removedNodes.forEach(node => {
          // use string comparison to support fragments
          if (node.constructor.name === 'HTMLDivElement') {
            maybeRemove(node);
          }
        })
      }
    }
  };
  observer = new MutationObserver(callback);
  observer.observe(document.body, config);
}

export const uninstall = () => {
  if (observer) {
    observer.disconnect();
    callbackMap.clear();
    observer = undefined;
  } else {
    console.log("not installed, doing nothing");
  }
}
