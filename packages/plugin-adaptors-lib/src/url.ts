import type { } from "@tiddlybase/tw5-types"

const FILES_PREFIX = 'files';
const CONFIG_KEY = 'default-storage-prefix';

const storagePrefix = $tw?.boot?.wikiInfo?.config[CONFIG_KEY] ?? $tw?.wiki?.getTiddler('$:/config/wikiInfoConfig')?.fields[CONFIG_KEY] ?? '';

const isAbsoluteUrl = (url:string) => {
  const lowercase = url.toLowerCase().trim();
  return lowercase.startsWith('http://') || lowercase.startsWith('https://') || lowercase.startsWith('//');
}

export const getParentURL = () => $tw?.tiddlybase?.parentLocation?.href;

export const makeAbsoluteURL = (possiblyRelativeURL:string) => {
  if (isAbsoluteUrl(possiblyRelativeURL)) {
    return possiblyRelativeURL;
  }
  if ($tw?.tiddlybase?.inSandboxedIframe && possiblyRelativeURL.startsWith(FILES_PREFIX) && $tw?.tiddlybase?.parentClient) {
      return $tw.tiddlybase.parentClient('getDownloadURL', [`${storagePrefix}${possiblyRelativeURL.substring(FILES_PREFIX.length)}`])
  }
  // it's a "real" relative URL, something relative to the parent.
  return (getParentURL() ?? '') + possiblyRelativeURL;
}
