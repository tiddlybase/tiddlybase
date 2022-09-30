  // Export name and synchronous status
  export const name = 'postboot-browser';
  export const after = ['load-modules'];
  export const synchronous = true;
  export const platforms = ['browser'];

  const fixGetLocationPath = () => {
    // replace $tw.utils.getLocationPath() so it uses parent frame's URL
    // TODO: this is pretty loose, could produce faulty results sometimes
    const originalGetLocationPath = $tw.utils.getLocationPath;
    $tw.utils.getLocationPath = () => originalGetLocationPath().replace(window.location.pathname, '/');
  };

  export const startup = function () {
    if (!!$tw?.tiddlybase?.topLevelClient) {
      fixGetLocationPath();
    }
  };
