/*\
title: $:/core/modules/savers/put.js
type: application/javascript
module-type: saver

Saves wiki by performing a PUT request to the server

Works with any server which accepts a PUT request
to the current URL, such as a WebDAV server.

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Static method that returns true if this saver is capable of working
*/
exports.canSave = function(wiki) {
	return false;
};

/*
Create an instance of this saver
*/
exports.create = function(wiki) {
	return null;
};

})();
