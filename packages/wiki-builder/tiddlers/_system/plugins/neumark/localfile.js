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

exports.run = function(relpath, title) {

    // Override the localfile macro from tiddlywiki-base-editions/desktop
    // with a call to the storageFile widget.
    return `<$storageFile src="${relpath}" title=${title}/>`;
};

})();
