// use full package path so the import is externalized
import { getWikiInfoConfigValue } from "./wiki-info-config";
import { joinPaths } from '@tiddlybase/shared/src/join-paths'
import type { StorageFileMetadata } from "packages/rpc/src/top-level-api";

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
const isTiddlyDesktop = () => !!$tw?.desktop;

// true if currently running in the browser as a regular .html TiddlyWiki file
const isStandaloneHtmlTiddlyWiki = () => !$tw.desktop && !$tw.tiddlybase && $tw.browser && location.protocol === 'file:'

// true if currently running in the browser served by the built-in tiddlywiki nodejs server
const isNodeServerTiddlyWiki = () => !$tw.desktop && !$tw.tiddlybase && $tw.browser && !!location.protocol.match('https?:')

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

const getFullStoragePath = (relativePath: string) => joinPaths($tw?.tiddlybase?.storageConfig?.filesPath ?? '', relativePath)

const getTiddlyDesktopUrl = (path: string): string => `file:///${joinPaths(desktopPrefix, path)}`;

const shouldCache = (metadata: StorageFileMetadata) => !!metadata.contentType?.startsWith('image/')

const resolveStorageBucketPath = async (path: string): Promise<string> => {
  const fullStoragePath = getFullStoragePath(path);
  const metadata = await $tw.tiddlybase!.topLevelClient!('getStorageFileMetadata', [fullStoragePath]);
  // caching isn't possible within sandboxed iframes without `allow-same-origin`, as the origin is
  // a unique origin which isn't equal even to itself, so the browser cache will never be consulted
  // when a file needs to be retrieved.
  // as a result, the fetch() should happen in the parent iframe for assets which need to be cached.
  if (shouldCache(metadata)) {
    const blob = await $tw.tiddlybase!.topLevelClient!('getStorageFileAsBlob', [fullStoragePath]);
    var urlCreator = window.URL || window.webkitURL;
    return urlCreator.createObjectURL(blob);
  } else {
    // no cachign required
    return await $tw.tiddlybase!.topLevelClient!('getStorageFileDownloadUrl', [fullStoragePath]);
  }
}

export const cleanupURL = (url:string) => {
  if (url.startsWith('blob:')) {
    const urlCreator = window.URL || window.webkitURL;
    urlCreator.revokeObjectURL(url);
  }
}

export const resolveURL = (url: string) => {
  // regular absolute URLs resolve to themselves, as do
  // relative URLs which do not start with FILES_URL_PREFIX
  if (isAbsoluteUrl(url) || !url.startsWith(FILES_URL_PREFIX)) {
    return url;
  }

  // relative URLs starting is FILES_URL_PREFIX are special
  // paths to the local filesystem or google storage and
  // must be resolved
  const path = url.substring(FILES_URL_PREFIX.length);
  if (isTiddlyDesktop()) {
    return getTiddlyDesktopUrl(path);
  }
  if (isStandaloneHtmlTiddlyWiki() || isNodeServerTiddlyWiki()) {
    return localFileRelativePath(path);
  }
  // Assume Tiddlybase.
  // if isLocal is true, make path absolute by prepending '/'
  if (!!$tw.tiddlybase?.isLocal) {
    return `/${localFileRelativePath(path)}`;
  }
  // otherwise resolve path as a GCP Storage bucket path
  return resolveStorageBucketPath(path);
}
