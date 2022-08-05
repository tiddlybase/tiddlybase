// use full package path so the import is externalized
import { getWikiInfoConfigValue } from "./wiki-info-config";
import {joinPaths} from '@tiddlybase/shared/src/join-paths'

const FILES_URL_PREFIX = getWikiInfoConfigValue("external-url-path-prefix");
const LOCAL_FILE_PREFIX = getWikiInfoConfigValue("default-local-file-location");

const isAbsoluteUrl = (url: string) => {
  const lowercase = url.toLowerCase().trim();
  return lowercase.startsWith('http://') || lowercase.startsWith('https://') || lowercase.startsWith('//');
}

export const getExtension = (url:string) => {
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

const getDesktopPathPrefix = () => {
  if ($tw?.desktop) {
    let pathPrefix = ([...(new URLSearchParams(window.location.search))].find(([k, v]) => k === 'pathname') ?? [])[1];
    // add default file location from tiddlywiki.info
    // TODO: handle case when this is an absolute path!
    return joinPaths(pathPrefix ?? '', LOCAL_FILE_PREFIX);
  }
  return '';
}


const desktopPrefix = getDesktopPathPrefix();

// Simply return relative path, but add the local file prefix
const nonSandboxedRelativePath = (path:string) => joinPaths(LOCAL_FILE_PREFIX, path);

const getFullStoragePath = (relativePath:string) => joinPaths($tw?.tiddlybase?.storageConfig?.filesPath ?? '', relativePath)

const getFilesURL = (path: string): string | Promise<string> => {
  // if running within the child iframe, make RPC call to parent for full url
  // of google storage resource.
  if ($tw?.tiddlybase?.topLevelClient) {
    return $tw.tiddlybase.topLevelClient('getDownloadURL', [getFullStoragePath(path)])
  }
  // if running under TiddlyDesktop, get URL of local file
  if ($tw?.desktop) {
    // Needs the slashes because joinsPaths() removes
    // leading path separator.
    return `file:///${joinPaths(desktopPrefix, path)}`;
  }
  // if running as "regular HTML"
  return nonSandboxedRelativePath(path);
}

export const resolveURL = (url: string) => {
  // 'files' URL, either a google storage file or in the TiddlyDesktop case
  // a local file.
  if (!isAbsoluteUrl(url) && url.startsWith(FILES_URL_PREFIX)) {
    // strip files URL prefix
    return getFilesURL(url.substring(FILES_URL_PREFIX.length));
  }
  // Absolute or non-file relative URL. No modificatio needed.
  return url;
}
