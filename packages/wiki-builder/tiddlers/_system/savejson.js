/*\
title: $:/temp/savejson.js
type: application/javascript
module-type: command

Saves individual tiddlers in their raw text or binary format to the specified files

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.info = {
	name: "savejson",
	synchronous: true
};

var Command = function(params,commander,callback) {
	this.params = params;
	this.commander = commander;
	this.callback = callback;
};

const filter = "[is[tiddler]] -[prefix[$:/state/popup/]] -[prefix[$:/temp/]] -[prefix[$:/HistoryList]] -[status[pending]plugin-type[import]] -[[$:/boot/boot.css]] -[type[application/javascript]library[yes]] -[[$:/boot/boot.js]] -[[$:/boot/bootprefix.js]] -[[$:/core]] +[sort[title]]";

Command.prototype.execute = function() {
	if(this.params.length < 1) {
		return "Missing output filename";
	}
	var self = this,
		fs = require("fs"),
		path = require("path"),
		wiki = this.commander.wiki,
		filename = path.resolve(self.commander.outputPath, this.params[0]);
    if(self.commander.verbose) {
        console.log("Saving JSON tiddlers \"" + filename + "\"");
    }
    $tw.utils.createFileDirectories(filename);
    fs.writeFileSync(filename, $tw.wiki.getTiddlersAsJson(filter), 'utf-8');
	return null;
};

exports.Command = Command;

})();
