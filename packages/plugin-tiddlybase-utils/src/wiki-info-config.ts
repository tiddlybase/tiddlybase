import {DEFAULT_CONFIG} from "@tiddlybase/tw5-types/src/default-config";

const WIKI_INFO_CONFIG_TIDDLER = '$:/config/wikiInfoConfig';

const parseTiddlerField = (key:string):any => {
  const value = $tw?.wiki?.getTiddler(WIKI_INFO_CONFIG_TIDDLER)?.fields[key];
  if (typeof value === 'string') {
    return JSON.parse(value)
  }
  return undefined;
}

export const getWikiInfoConfigValue = <T extends keyof $tw.WikiInfoConfig>(key: T):$tw.WikiInfoConfig[T] => {
  // If running under node or as TiddlyDesktop, $tw.boot.wikiInfo is available.
  // If running in the browser as a "built" HTML wiki, then config values may be
  // read from WIKI_INFO_CONFIG_TIDDLER.
  // The hard-coded defaults are also there as a fallback.
  return ($tw?.boot?.wikiInfo?.config[key] ?? parseTiddlerField(key) ?? DEFAULT_CONFIG[key]);
}
