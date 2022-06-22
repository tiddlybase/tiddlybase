import type {} from "@tiddlybase/tw5-types/src/index"

export const findNavigator = (parent = $tw.rootWidget):$tw.Widget|undefined => {
  const isNavigator = (child:$tw.Widget) => child?.parseTreeNode?.type === 'navigator'
  if (parent) {
    for (let child of parent.children || []) {
        if (isNavigator(child)) {
            // console.log("found navigator as child", child);
            return child;
        }
        // console.log("searching for navigator in children");
        const descendent = findNavigator(child);
        if (descendent) {
            return descendent;
        }

    }
  }
  return undefined;
};
