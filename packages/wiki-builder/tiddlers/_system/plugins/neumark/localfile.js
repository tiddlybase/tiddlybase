/*\
module-type: macro
tags:
title: $:/plugins/neumark/localfile.js
type: application/javascript

\*/

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Information about this macro
*/

exports.name = "localfile";

exports.params = [
	// (mandatory) path param
	{name: "relpath"},
	// optional parameter
	{name: "title"}
];

const CONFIG_KEY = 'default-storage-prefix';

const storagePrefix = $tw?.boot?.wikiInfo?.config[CONFIG_KEY] ?? $tw?.wiki?.getTiddler('$:/config/wikiInfoConfig')?.fields[CONFIG_KEY] ?? '';

exports.run = function(relpath, title) {

    // Override the localfile macro from tiddlywiki-base-editions/desktop
    // with a call to the storageFile widget.
    return `<$storageFile src="${storagePrefix}${relpath}" title=${title}/>`;
};

})();
