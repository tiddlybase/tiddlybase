import type { } from '@tiddlybase/tw5-types/src/index'
import {joinPaths} from '@tiddlybase/shared/src/join-paths'

export const getWikiPath = (
  storageConfig: $tw.StorageConfig,
  wikiName: string,
  isLocal: boolean = false):string => {
  if (isLocal) {
    return "/" + wikiName;
  }
  return joinPaths(storageConfig.wikisPath, wikiName);

}

const readJsonFromStorage = async (topLevelClient: $tw.TWTiddlybase["topLevelClient"], path:string): Promise<any> => {
  const blob = await topLevelClient!('getStorageFileAsBlob', [path]);
  return JSON.parse(await blob.text());
}

export const loadWikiTiddlers = async (
  topLevelClient: $tw.TWTiddlybase["topLevelClient"],
  storageConfig: $tw.StorageConfig,
  wikiName: string,
  isLocal: boolean = false): Promise<Array<$tw.TiddlerFields>> => {
  // TODO: support for HTML wiki files
  // TODO: fetch() error handling
  return await readJsonFromStorage(topLevelClient, getWikiPath(storageConfig, wikiName, isLocal));
}
