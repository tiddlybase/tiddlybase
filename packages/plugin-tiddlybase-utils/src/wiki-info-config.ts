import { WikiInfoConfig } from "packages/tw5-types/src";

const WIKI_INFO_CONFIG_TIDDLER = '$:/config/wikiInfoConfig';

const parseTiddlerField = (key:string):any => {
  const value = $tw?.wiki?.getTiddler(WIKI_INFO_CONFIG_TIDDLER)?.fields[key];
  if (typeof value === 'string') {
    return JSON.parse(value)
  }
  return undefined;
}

export const getWikiInfoConfigValue = <T extends keyof WikiInfoConfig>(key: T):WikiInfoConfig[T] => {
  return ($tw?.boot?.wikiInfo?.config[key] ?? parseTiddlerField(key)) as WikiInfoConfig[T];
}
