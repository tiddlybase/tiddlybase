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

  const objMap = (fn, input) => Object.fromEntries(Object.entries(input).map(fn));

  const saveWikiInfoConfig = () => {
    if ($tw?.boot?.wikiInfo?.config) {
      $tw.wiki.addTiddler(
        new $tw.Tiddler({
          ...(objMap(
              ([k, v]) => [k, JSON.stringify(v)],
              $tw.boot.wikiInfo?.config ?? {})),
          title: '$:/config/wikiInfoConfig',
          }),
      );
    }
  };

  exports.startup = function () {
    saveWikiInfoConfig();
  };

})();
