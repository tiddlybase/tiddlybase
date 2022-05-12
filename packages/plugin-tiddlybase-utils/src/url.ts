import { $tw } from "@tiddlybase/tw5-types";
// use full package path so the import is externalized
import { getWikiInfoConfigValue } from "@tiddlybase/plugin-tiddlybase-utils/src/wiki-info-config";

const FILES_URL_PREFIX = getWikiInfoConfigValue("external-url-path-prefix") ?? "";
const STORAGE_FILE_PREFIX = getWikiInfoConfigValue("default-storage-prefix");
const LOCAL_FILE_PREFIX = getWikiInfoConfigValue("default-file-location");

const PATH_SEPARATOR = "/";

// remove separators at beginning and end of path
// TODO: would be nice if separator wasn't repeated int he regexps...
const trimSeparators = (path:string|undefined) => path && path.replace(/^[\/]+/, '').replace(/[\/]+$/, '')

// NOTE: removes leading and trailing '/'
const joinPaths = (...parts:Array<string|undefined>) => parts
  .map(trimSeparators)
  .filter(part => part && part?.length > 0)
  .join(PATH_SEPARATOR);

const isAbsoluteUrl = (url: string) => {
  const lowercase = url.toLowerCase().trim();
  return lowercase.startsWith('http://') || lowercase.startsWith('https://') || lowercase.startsWith('//');
}

export const getParentURL = () => $tw?.tiddlybase?.parentLocation?.href;

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
    return joinPaths(pathPrefix, LOCAL_FILE_PREFIX);
  }
  return '';
}


const desktopPrefix = getDesktopPathPrefix();

// Simply return relative path, but add the local file prefix
const nonSandboxedRelativePath = (path:string) => joinPaths(LOCAL_FILE_PREFIX, path);

const getFilesURL = (path: string): string | Promise<string> => {
  // if running within the child iframe, make RPC call to parent for full url
  // of google storage resource.
  if ($tw?.tiddlybase?.inSandboxedIframe && $tw?.tiddlybase?.parentClient) {
    return $tw.tiddlybase.parentClient('getDownloadURL', [joinPaths(STORAGE_FILE_PREFIX, path)])
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
  // absolute URL, no modification needed
  if (isAbsoluteUrl(url)) {
    return url;
  }
  // 'files' URL, either a google storage file or in the TiddlyDesktop case
  // a local file.
  if (url.startsWith(FILES_URL_PREFIX)) {
    // strip files URL prefix
    return getFilesURL(url.substring(FILES_URL_PREFIX.length));
  }
  // Regular relative URL. If running in a sandboxed iframe, prefix
  // with parent window's URL.
  return (getParentURL() ?? '') + url;
}
