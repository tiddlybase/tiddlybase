import type { } from '@tiddlybase/tw5-types/src/index'
import {joinPaths} from '@tiddlybase/shared/src/join-paths'

const readJsonFromStorage = async (topLevelClient: $tw.TWTiddlybase["topLevelClient"], path:string): Promise<any> => {
  const blob = await topLevelClient!('getStorageFileAsBlob', [path]);
  return JSON.parse(await blob.text());
}

const readJsonWithFetch = async (url: string): Promise<any> => {
  return await (await (fetch(url))).json();
}

export const loadWikiTiddlers = async (
  topLevelClient: $tw.TWTiddlybase["topLevelClient"],
  storageConfig: $tw.StorageConfig,
  wikiName: string,
  isLocal: boolean = false): Promise<Array<$tw.TiddlerFields>> => {
  // TODO: support for HTML wiki files
  // TODO: fetch() error handling
  return await (isLocal ? readJsonWithFetch("/" + wikiName) : readJsonFromStorage(topLevelClient, joinPaths(storageConfig.wikisPath, wikiName)));
}
