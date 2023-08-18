// use full package path so the import is externalized
import type {} from '@tiddlybase/tw5-types/src/index'
import { getWikiInfoConfigValue } from "./wiki-info-config";
import { joinPaths } from './join-paths'

const FILES_URL_PREFIX = getWikiInfoConfigValue("external-url-path-prefix");
const LOCAL_FILE_PREFIX = getWikiInfoConfigValue("default-local-file-location");

const isAbsoluteUrl = (url: string) => {
  const lowercase = url.toLowerCase().trim();
  return lowercase.startsWith('http://') || lowercase.startsWith('https://') || lowercase.startsWith('//');
}

export const getExtension = (url: string) => {
  const pathName = new URL(url, "http://www.example.com").pathname;
  if (pathName.indexOf('.') < 0) {
    return undefined;
  }
  const parts = pathName.split('.');
  if (parts.length === 0) {
    // no extension
    return undefined;
  }
  return parts.slice(-1)[0].toLowerCase();
}

// true if currently running in TiddlyDesktop
const isTiddlyDesktop = (tw:typeof $tw=globalThis.$tw) => !!tw?.desktop;

// true if currently running in the browser as a regular .html TiddlyWiki file
const isStandaloneHtmlTiddlyWiki = (tw:typeof $tw=globalThis.$tw, loc=location) => !isTiddlyDesktop(tw) && !tw.tiddlybase && tw.browser && loc.protocol === 'file:'

// true if currently running in the browser served by the built-in tiddlywiki nodejs server
const isNodeServerTiddlyWiki = (tw:typeof $tw=globalThis.$tw, loc=location) => !isTiddlyDesktop(tw) && !tw.tiddlybase && tw.browser && !!loc.protocol.match('https?:')

const getDesktopPathPrefix = () => {
  if (isTiddlyDesktop()) {
    let pathPrefix = ([...(new URLSearchParams(window.location.search))].find(([k, v]) => k === 'pathname') ?? [])[1];
    // add default file location from tiddlywiki.info
    // TODO: handle case when this is an absolute path!
    return joinPaths(pathPrefix ?? '', LOCAL_FILE_PREFIX);
  }
  return '';
}


const desktopPrefix = getDesktopPathPrefix();

// Simply return relative path, but add the local file prefix
const localFileRelativePath = (path: string) => joinPaths(LOCAL_FILE_PREFIX, path);

const getTiddlyDesktopUrl = (path: string): string => `file:///${joinPaths(desktopPrefix, path)}`;

// try to cache anything except videos
const HTTP_CACHE_EXTENSION_BLACKLIST = new Set<string>(['mpg', 'mpeg', 'mov', 'avi', 'mkv', 'mp4'])
const shouldCache = (url: string) => !HTTP_CACHE_EXTENSION_BLACKLIST.has(getExtension(url) ?? '')

const blobToUrl = (blob:Blob):string => {
  var urlCreator = window.URL || window.webkitURL;
  return urlCreator.createObjectURL(blob);
}

const resolveStorageBucketPath = async (path: string, tw:typeof $tw=globalThis.$tw): Promise<string> => {
  const fileRef = await tw.tiddlybase!.topLevelClient!('readFile', [path, shouldCache(path) ? "blob" : "url"]);
  if (fileRef.type === 'blob') {
    return blobToUrl(fileRef.blob)
  }
  return fileRef.url
}

export const cleanupURL = (url:string) => {
  if (url.startsWith('blob:')) {
    const urlCreator = window.URL || window.webkitURL;
    urlCreator.revokeObjectURL(url);
  }
}

export const resolveURL = (url: string, tw:typeof $tw=globalThis.$tw) => {
  // regular absolute URLs resolve to themselves, as do
  // relative URLs which do not start with FILES_URL_PREFIX
  if (isAbsoluteUrl(url) || !url.startsWith(FILES_URL_PREFIX)) {
    return url;
  }

  // relative URLs starting is FILES_URL_PREFIX are special
  // paths to the local filesystem or google storage and
  // must be resolved
  const path = url.substring(FILES_URL_PREFIX.length);
  if (isTiddlyDesktop(tw)) {
    return getTiddlyDesktopUrl(path);
  }
  if (isStandaloneHtmlTiddlyWiki(tw) || isNodeServerTiddlyWiki(tw)) {
    return localFileRelativePath(path);
  }
  // Assume Tiddlybase.
  // if isLocal is true, make path absolute by prepending '/'
  if (!!tw.tiddlybase?.isLocal) {
    return `/${localFileRelativePath(path)}`;
  }
  // otherwise resolve path as a GCP Storage bucket path
  return resolveStorageBucketPath(path, tw);
}
