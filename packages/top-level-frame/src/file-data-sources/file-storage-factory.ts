import type { FileStorageSpec, FilesConfig, LaunchParameters } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import type { ReadOnlyFileStorage, FileStorage, FileReference, UploadEventHandler, UploadController } from "@tiddlybase/shared/src/file-data-source";
import { Lazy } from "@tiddlybase/shared/src/lazy";
import type { FirebaseApp } from '@firebase/app'
import  { getStorage } from '@firebase/storage'
import { FirebaseStorageFileStorage } from "./firebase-storage-file-source";
import { HttpFileStorage } from "./http-file-source";
import { RPC } from "../types";
import { CallbackMap } from "@tiddlybase/rpc/src/types";
import { FileStorageError } from "./file-storage-errors";

export class ReadOnlyFileStorageWrapper implements FileStorage {
  wrappedStorage: ReadOnlyFileStorage;
  constructor(wrappedStorage: ReadOnlyFileStorage) {
    this.wrappedStorage = wrappedStorage
  }
  writeFile (
    filename: string,
    contents: Blob,
    metadata?: Record<string, string>,
    uploadEventHandler?: CallbackMap<UploadEventHandler>): Promise<CallbackMap<UploadController>> {
      throw new FileStorageError('unsupported-operation', 'Read-only FileStorage instance does not support writeFile()');
    }

  deleteFile (filename: string): Promise<void> {
    throw new FileStorageError('unsupported-operation', 'Read-only FileStorage instance does not support deleteFile()');
  }
  readFile(filename: string, referenceType?: "url" | "blob" | undefined):Promise<FileReference> {
    return this.wrappedStorage.readFile(filename, referenceType);
  }

}

export const makeFileStorage = (launchParameters:LaunchParameters, rpc:RPC, lazyFirebaseApp: Lazy<FirebaseApp>, filesConfig:FilesConfig):FileStorage|undefined => {
  // Eventually, this function should return a routing proxy similar to
  // RoutingProxyTiddlerSource for tiddlers.
  // For now, just return the first FileDataSource defined in the config.
  if (filesConfig.fileStorage.length > 0) {
    return initFileStorage(launchParameters, rpc, lazyFirebaseApp, filesConfig.fileStorage[0]);
  }
  return undefined;
}

export const initFileStorage = (launchParameters:LaunchParameters, rpc:RPC, lazyFirebaseApp: Lazy<FirebaseApp>, fileDataSourceSpec: FileStorageSpec): FileStorage => {
  switch (fileDataSourceSpec.type) {
    case 'firebase-storage':
      return new FirebaseStorageFileStorage(
        launchParameters,
        getStorage(lazyFirebaseApp()),
        rpc.rpcCallbackManager,
        fileDataSourceSpec.collection)
    case 'http':
      return new ReadOnlyFileStorageWrapper(new HttpFileStorage(fileDataSourceSpec.urlPrefix));
  }
}
