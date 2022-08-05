import type {} from '@tiddlybase/tw5-types/src/index'
import {DEFAULT_CONFIG} from "@tiddlybase/tw5-types/src/default-config";

import {TIDDLER_TITLE_WIKI_INFO_CONFIG} from './constants';

const objMap = <V, O>(fn: ([k, v]: [string, V]) => [string, O], input: Record<string, V>): Record<string, O> =>
  Object.fromEntries(Object.entries(input).map(fn));

export const createWikiInfoConfig = (wikiSettings?: Partial<$tw.WikiInfoConfig>):$tw.TiddlerFields => ({
  ...(objMap(
    ([k, v]) => [k, JSON.stringify(v)],
    wikiSettings ?? {})),
  title: TIDDLER_TITLE_WIKI_INFO_CONFIG,
});

const parseTiddlerField = (key:string):any => {
  const value = $tw?.wiki?.getTiddler(TIDDLER_TITLE_WIKI_INFO_CONFIG)?.fields[key];
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
