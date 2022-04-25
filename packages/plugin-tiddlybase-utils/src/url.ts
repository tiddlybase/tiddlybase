import { $tw } from "@tiddlybase/tw5-types";
// use full package path so the import is externalized
import { getWikiInfoConfigValue } from "@tiddlybase/plugin-tiddlybase-utils/src/wiki-info-config";

const FILES_PREFIX = 'files';
const STORAGE_PREFIX_CONFIG_KEY = 'default-storage-prefix';
const LOCAL_FS_PREFIX_CONFIG_KEY = 'default-file-location';

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
    const fileLocation = getWikiInfoConfigValue(LOCAL_FS_PREFIX_CONFIG_KEY)
    pathPrefix += fileLocation ? `/${fileLocation}` : '';
    return pathPrefix;
  }
  return undefined;
}

const storagePrefix = getWikiInfoConfigValue(STORAGE_PREFIX_CONFIG_KEY) ?? '';
const desktopPrefix = getDesktopPathPrefix();

const getFilesURL = (subPath: string): string | Promise<string> => {
  // if running within the child iframe, make RPC call to parent for full url
  if ($tw?.tiddlybase?.inSandboxedIframe && $tw?.tiddlybase?.parentClient) {
    return $tw.tiddlybase.parentClient('getDownloadURL', [`${storagePrefix}${subPath.substring(FILES_PREFIX.length)}`])
  }
  // if running under TiddlyDesktop
  if ($tw?.desktop) {
    return `file://${desktopPrefix}/${subPath}`;
  }
  // if running as "regular HTML", simply return relative path as-is
  return subPath;
}

export const resolveURL = (possiblyRelativeURL: string) => {
  // absolute URL
  if (isAbsoluteUrl(possiblyRelativeURL)) {
    return possiblyRelativeURL;
  }
  // 'files/' URL
  if (possiblyRelativeURL.startsWith(FILES_PREFIX)) {
    return getFilesURL(possiblyRelativeURL);
  }
  // "real" relative URL, use parent window's URL as base if in iframe
  return (getParentURL() ?? '') + possiblyRelativeURL;
}