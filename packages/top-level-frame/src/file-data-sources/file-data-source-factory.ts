import type { FileDataSourceSpec, FilesConfig } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import type { FileDataSource, WritableFileDataSource } from "@tiddlybase/shared/src/file-data-source";
import { Lazy } from "@tiddlybase/shared/src/lazy";
import type { FirebaseApp } from '@firebase/app'
import  { getStorage } from '@firebase/storage'
import { FirebaseStorageDataSource } from "./firebase-storage-file-source";
import { HttpFileDataSource } from "./http-file-source";
import { RPC } from "../types";

export const makeFileDataSource = (rpc:RPC, lazyFirebaseApp: Lazy<FirebaseApp>, instanceName: string, filesConfig:FilesConfig):FileDataSource|WritableFileDataSource|undefined => {
  // Eventually, this function should return a routing proxy similar to
  // RoutingProxyTiddlerSource for tiddlers.
  // For now, just return the first FileDataSource defined in the config.
  if (filesConfig.sources.length > 0) {
    return initFileDataSource(rpc, lazyFirebaseApp, instanceName, filesConfig.sources[0]);
  }
  return undefined;
}

export const initFileDataSource = (rpc:RPC, lazyFirebaseApp: Lazy<FirebaseApp>, instanceName: string, fileDataSourceSpec: FileDataSourceSpec): FileDataSource => {
  switch (fileDataSourceSpec.type) {
    case 'firebase-storage':
      return new FirebaseStorageDataSource(
        rpc.rpcCallbackManager,
        getStorage(lazyFirebaseApp()),
        instanceName,
        fileDataSourceSpec.collection)
    case 'http':
      return new HttpFileDataSource(fileDataSourceSpec.urlPrefix);
  }
}
