  // Export name and synchronous status
  export const name = 'postboot-browser';
  export const after = ['load-modules'];
  export const synchronous = true;
  export const platforms = ['browser'];

  const fixGetLocationPath = () => {
    // replace $tw.utils.getLocationPath() so it uses parent frame's URL
    // http://localhost:8080/?local_wiki=true#2021-04-10%20Nasz%C3%A1j%20Kosdr%C3%B3l
    $tw.utils.getLocationPath = () => $tw?.tiddlybase?.parentLocation?.href?.split('#')?.[0]!
  };

  export const startup = function () {
    if ($tw?.tiddlybase?.inSandboxedIframe) {
      fixGetLocationPath();
    }
  };
