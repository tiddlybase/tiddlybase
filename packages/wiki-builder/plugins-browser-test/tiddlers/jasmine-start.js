/*\
title: $:/plugins/tiddlywiki/jasmine/jasmine-start.js
type: application/javascript
module-type: startup

Trigger execution of Jasmine test plugin for TiddlyWiki5

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: true */
"use strict";

console.log("running jasmine-start module");

exports.name = "jasmine-start";
exports.after = ["jasmine"];
exports.platforms = ["browser"];
/* Jasmine executes the tests in a window.onload function:
 * https://github.com/Jermolene/TiddlyWiki5/blob/bef11fe6a25fb849dee40c4aa4337d6a30daf0b4/plugins/tiddlywiki/jasmine/files/jasmine-core/lib/jasmine-core/boot.js#L142-L148
 * The tiddlybase/init plugin adds it's on onload function, resulting in this function not triggering when expected.
 * The short-term solution is to call onload() explicitly from this startup tiddler.
 */
exports.startup = () => globalThis.onload();
})();
