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

const path = require("path");
const fs = require("fs");
const util = require("util");

exports.method = "GET";

const CONFIG_KEY_PUBLIC_DIR = 'public-dir';
const CONFIG_KEY_OUTER_HTML_PATH = 'outer-html-path';
const CONFIG_KEY_PUBLIC_SUBDIRS = 'public-subdirs';
const DEFAULT_PUBLIC_DIR = "public";
const DEFAULT_OUTER_HTML_FILENAME = "outer.html";
const DEFAULT_PUBLIC_SUBDIRS = ['tiddlybase_public', 'sourcemaps', 'webfonts', 'collections'];
const PUBLIC_DIR = $tw.boot.wikiInfo.config[CONFIG_KEY_PUBLIC_DIR] ?? DEFAULT_PUBLIC_DIR;
const OUTER_HTML_PATH = $tw.boot.wikiInfo.config[CONFIG_KEY_OUTER_HTML_PATH] ?? path.join(PUBLIC_DIR, DEFAULT_OUTER_HTML_FILENAME);
const PUBLIC_SUBDIRS = $tw.boot.wikiInfo.config[CONFIG_KEY_PUBLIC_SUBDIRS] ?? DEFAULT_PUBLIC_SUBDIRS;

const mappings = Object.fromEntries([
    ["^\/(?:\\?.*)?$", OUTER_HTML_PATH],
    // instance
    ["^\/i\/?.*$", OUTER_HTML_PATH],
    // a file in the public directory, careful not to match tiddlyweb paths like /status
    ["^\/([^\/]+\\.[^\/]+)$", PUBLIC_DIR],
    ...(PUBLIC_SUBDIRS.map(subdir => [
        `^\/${subdir}\/(.+)$`,
        path.join(PUBLIC_DIR, subdir),
    ]))
])

const getMapping = url => {
    for (let [re, mapping] of Object.entries(mappings)) {
        if (url.match(re)) {
            return mapping;
        }
    }
}

exports.path = new RegExp(Object.keys(mappings).join("|"));


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
    const filename = getFullPath(state.boot.wikiPath, getMapping(request.url), params.length > 0 ? $tw.utils.decodeURIComponentSafe(params[0]): undefined);
    console.log(`requested ${request.url} returning ${filename}`);
	const extension = path.extname(filename);
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
};

}());
