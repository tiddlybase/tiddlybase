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

const maybeRemove = (removedNode: Node) => {
  // naive strategy: for each monitored element, see if the
  // removed node was a parent.
  callbackMap.forEach((callback: MonitorCallback, monitoredElement: HTMLElement) => {
    if (isOrphan(monitoredElement, removedNode)) {
      callback(removedNode);
    }
    callbackMap.delete(monitoredElement);
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

export const monitorRemoval = (monitoredElement: HTMLElement, callback: MonitorCallback) => {
  callbackMap.set(monitoredElement, callback);
}


