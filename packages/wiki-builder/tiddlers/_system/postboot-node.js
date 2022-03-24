/*\
title: $:/postboot-node.js
type: application/javascript
module-type: startup

\*/

(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict';

  // Export name and synchronous status
  exports.name = 'postboot-node';
  exports.after = ['load-modules'];
  exports.synchronous = true;
  exports.platforms = ['node'];

  const saveWikiInfoConfig = () => {
    if ($tw?.boot?.wikiInfo?.config) {
      $tw.wiki.addTiddler(
        new $tw.Tiddler({ title: '$:/config/wikiInfoConfig', ...$tw.boot.wikiInfo.config }),
      );
    }
  };

  exports.startup = function () {
    saveWikiInfoConfig();
  };

})();
