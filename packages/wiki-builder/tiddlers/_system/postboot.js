/*\
title: $:/postboot.js
type: application/javascript
module-type: startup

\*/

(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict';

  // Export name and synchronous status
  exports.name = 'postboot';
  exports.after = ['load-modules'];
  exports.synchronous = true;

  const fixEditorForMobileBrowsers = () => {
    // from: https://www.woolie.co.uk/article/tiddlywiki-codemirror-vim-bindings/
    if (/Android|webOS|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent || navigator.vendor || window.opera)) {
      $tw.wiki.addTiddler(
        new $tw.Tiddler({ title: '$:/config/EditorTypeMappings/text/vnd.tiddlywiki', text: 'text' }),
      );
    } else {
      $tw.wiki.addTiddler(
        new $tw.Tiddler({ title: '$:/config/EditorTypeMappings/text/vnd.tiddlywiki', text: 'codemirror' }),
      );
    }
  };

  const fixGetLocationPath = () => {
    // replace $tw.utils.getLocationPath() so it uses parent frame's URL
    $tw.utils.getLocationPath = () => `${$tw.parentLocation.protocol}//${$tw.parentLocation.hostname}${$tw.parentLocation.port ? `:${$tw.parentLocation.port}` : ''}${$tw.parentLocation.pathname}${$tw.parentLocation.search}`;
  };

  const saveWikiInfoConfig = () => {
    if ($tw?.boot?.wikiInfo?.config) {
      $tw.wiki.addTiddler(
        new $tw.Tiddler({ title: '$:/config/wikiInfoConfig', ...$tw.boot.wikiInfo.config }),
      );
    }
  };

  exports.startup = function () {
    if ($tw.browser) {
      fixEditorForMobileBrowsers();
      fixGetLocationPath();
    } else {
      saveWikiInfoConfig();
    }

  };



})();
