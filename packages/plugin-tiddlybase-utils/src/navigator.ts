/// <reference types="@tiddlybase/tw5-types/src/tiddlybase" />
export const findNavigator = (parent = $tw.rootWidget):$tw.Widget|undefined => {
  const isNavigator = (child:$tw.Widget) => child?.parseTreeNode?.type === 'navigator'
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
  return undefined;
};
