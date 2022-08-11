import type { } from '@tiddlybase/tw5-types/src/index'
import {joinPaths} from '@tiddlybase/shared/src/join-paths'

export const getWikiURL = async (
  topLevelClient: $tw.TWTiddlybase["topLevelClient"],
  storageConfig: $tw.StorageConfig,
  wikiName: string,
  isLocal: boolean = false) => {
  if (isLocal) {
    return "/" + wikiName;
  }
  const fullPath = joinPaths(storageConfig.wikisPath, wikiName);
  return topLevelClient!('getDownloadURL', [fullPath]);
}

export const loadWikiTiddlers = async (
  topLevelClient: $tw.TWTiddlybase["topLevelClient"],
  storageConfig: $tw.StorageConfig,
  wikiName: string,
  isLocal: boolean = false): Promise<Array<$tw.TiddlerFields>> => {
  // TODO: support for HTML wiki files
  // TODO: fetch() error handling
  return await (await fetch(await getWikiURL(topLevelClient, storageConfig, wikiName, isLocal))).json()
}
