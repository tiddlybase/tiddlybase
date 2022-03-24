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
  exports.platforms = ['node'];

  const fixGetLocationPath = () => {
    // replace $tw.utils.getLocationPath() so it uses parent frame's URL
    $tw.utils.getLocationPath = () => `${$tw.parentLocation.protocol}//${$tw.parentLocation.hostname}${$tw.parentLocation.port ? `:${$tw.parentLocation.port}` : ''}${$tw.parentLocation.pathname}${$tw.parentLocation.search}`;
  };

  exports.startup = function () {
    fixGetLocationPath();
  };

})();
