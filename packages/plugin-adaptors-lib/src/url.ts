import type { } from "@firebase-auth-loader/tw5-types"
import type { ExtendedTW } from "@firebase-auth-loader/child-iframe/src/addParentClient";

const FILES_PREFIX = 'files';
const CONFIG_KEY = 'default-storage-prefix';

const storagePrefix = $tw?.boot?.wikiInfo?.config[CONFIG_KEY] ?? $tw?.wiki?.getTiddler('$:/config/wikiInfoConfig')?.fields[CONFIG_KEY] ?? '';

const parentClient = ($tw as ExtendedTW).parentClient!;

const isAbsoluteUrl = (url:string) => {
  const lowercase = url.toLowerCase().trim();
  return lowercase.startsWith('http://') || lowercase.startsWith('https://') || lowercase.startsWith('//');
}

export const getParentURL = () => ($tw as ExtendedTW).parentLocation.href;

export const makeAbsoluteURL = (possiblyRelativeURL:string) => {
  console.log("url.ts", possiblyRelativeURL);
  if (isAbsoluteUrl(possiblyRelativeURL)) {
    return possiblyRelativeURL;
  }
  if (possiblyRelativeURL.startsWith(FILES_PREFIX)) {
    return parentClient('getDownloadURL', [`${storagePrefix}${possiblyRelativeURL.substring(FILES_PREFIX.length)}`])
  }
  // it's a "real" relative URL, something relative to the parent.
  return getParentURL() + possiblyRelativeURL;
}
