/*\
title: $:/postboot-browser.js
type: application/javascript
module-type: startup

\*/

(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict';

  // Export name and synchronous status
  exports.name = 'postboot-browser';
  exports.after = ['load-modules'];
  exports.synchronous = true;
  exports.platforms = ['browser'];

  const fixGetLocationPath = () => {
    // replace $tw.utils.getLocationPath() so it uses parent frame's URL
    // http://localhost:8080/?local_wiki=true#2021-04-10%20Nasz%C3%A1j%20Kosdr%C3%B3l
    $tw.utils.getLocationPath = () => $tw.tiddlybase.parentLocation.href.split('#')[0]
  };

  exports.startup = function () {
    if ($tw?.tiddlybase?.inSandboxedIframe) {
      fixGetLocationPath();
    }
  };

})();
