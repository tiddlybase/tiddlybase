/*\
title: $:/core/modules/server/routes/get-extra-files.js
type: application/javascript
module-type: route

GET /:filename

\*/
(function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

exports.method = "GET";

const mappings = {
    "^\/(?:\\?.*)?$": globalThis.$tw.boot.wikiInfo.config['index-html-path'],
    "^\/([^\/]+)$": "public",
    "^\/tiddlybase_public\/(.+)$": "public/tiddlybase_public",
    "^\/sourcemaps\/(.+)$": "public/sourcemaps",
    "^\/webfonts\/(.+)$": "public/webfonts",
    "^\/collections\/(.+)$": "public/collections"
}

const getMapping = url => {
    for (let [re, mapping] of Object.entries(mappings)) {
        if (url.match(re)) {
            return mapping;
        }
    }
}

exports.path = new RegExp(Object.keys(mappings).join("|"));

const path = require("path");
const fs = require("fs");
const util = require("util");

const getFullPath = (rootDir, subPath, filename) => {
    let fullPath = rootDir;
    if (subPath) {
        fullPath = path.resolve(fullPath, subPath);
    }
    if (filename) {
        fullPath = path.resolve(fullPath, filename);
    }
    return fullPath;
};

exports.handler = function(request,response,state) {
    const params = state.params.filter(p => p)
    console.log("get-extra-files", request.url);
    const filename = getFullPath(state.boot.wikiPath, getMapping(request.url), params.length > 0 ? $tw.utils.decodeURIComponentSafe(params[0]): undefined);
	const extension = path.extname(filename);
	// Check that the filename is inside the wiki files folder
	if(path.relative(state.boot.wikiPath, filename).indexOf("..") !== 0) {
		// Send the file
		fs.readFile(filename,function(err,content) {
			var status,content,type = "text/plain";
			if(err) {
				console.log("Error accessing file " + filename + ": " + err.toString());
				status = 404;
				content = "File '" + filename + "' not found";
			} else {
				status = 200;
				content = content;
				type = ($tw.config.fileExtensionInfo[extension] ? $tw.config.fileExtensionInfo[extension].type : "application/octet-stream");
			}
			state.sendResponse(status,{
                "Content-Type": type,
                "Access-Control-Allow-Origin": "*"
            },content);
		});
	} else {
		state.sendResponse(404,{"Content-Type": "text/plain"},"File '" + suppliedFilename + "' not found");
	}
};

}());
