/*\
title: $:/test-utils.js
type: application/javascript
module-type: library

\*/
(function () {

  const findNavigator = (parent = $tw.rootWidget) => {
    const isNavigator = child => child?.parseTreeNode?.type === 'navigator'
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
  };

  Object.assign(exports, {findNavigator})

})();
