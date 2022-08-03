import type { TiddlybaseWikiSettings } from "./tiddlybase-wiki-settings";

export const WIKI_INFO_CONFIG_TIDDLER_TITLE = '$:/config/wikiInfoConfig';

const objMap = <V, O>(fn: ([k, v]: [string, V]) => [string, O], input: Record<string, V>): Record<string, O> =>
  Object.fromEntries(Object.entries(input).map(fn));

export const createWikiInfoConfig = (wikiSettings?: Partial<TiddlybaseWikiSettings>) => ({
  ...(objMap(
    ([k, v]) => [k, JSON.stringify(v)],
    wikiSettings ?? {})),
  title: WIKI_INFO_CONFIG_TIDDLER_TITLE,
});
