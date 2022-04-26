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
  exports.after = ['jasmine'];
  exports.synchronous = true;
  exports.platforms = ['browser'];

  const reporter = {
      jasmineDone(...args) {
        console.log("jasmine finished", args);
      }
  };

  exports.startup = function () {
      window.jasmine.getEnv().addReporter(reporter)
  };

})();
