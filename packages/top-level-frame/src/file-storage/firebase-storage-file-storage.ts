import { FileReference, FileReferenceType, UploadController, UploadEventHandler, FileStorage } from "@tiddlybase/shared/src/file-storage";
import { FirebaseStorage, getDownloadURL, ref, uploadBytesResumable, deleteObject } from '@firebase/storage';
import { normalizeFirebaseReadError } from "../firebase-utils";
import { CallbackMap } from "@tiddlybase/rpc/src/types";
import { RPCCallbackManager } from "@tiddlybase/rpc/src/rpc-callback-manager";
import { LaunchParameters } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import mustache from 'mustache'
import { uriEncodeLaunchParameters } from "../tiddler-storage/tiddler-storage-utils";
import { CacheAPIWrapper } from "./cache-api-wrapper";

// TODO: this files prefix should be configurable in the future!
const FILES_PREFIX = "files/"
const DEFAULT_PATH_TEMPLATE = `/{{instance}}/{{collection}}/{{filename}}`

export class FirebaseStorageFileStorage implements FileStorage {
  storage: FirebaseStorage;
  collectionPath: string;
  rpcCallbackManager: RPCCallbackManager;
  launchParameters: LaunchParameters;
  cache: CacheAPIWrapper;

  constructor(
    launchParameters:LaunchParameters,
    storage: FirebaseStorage,
    rpcCallbackManager: RPCCallbackManager,
    collection?: string,
    pathTemplate?: string
  ) {
    this.launchParameters = uriEncodeLaunchParameters(launchParameters);
    this.rpcCallbackManager = rpcCallbackManager;
    this.storage = storage;
    this.collectionPath = mustache.render(pathTemplate ?? DEFAULT_PATH_TEMPLATE, {
      ...this.launchParameters,
      collection: encodeURIComponent(collection ?? "")
    });
    this.cache = new CacheAPIWrapper(launchParameters.instance)
  }

  private stripFilesPrefix(pathpart:string):string {
    if (pathpart.startsWith(FILES_PREFIX)) {
      return pathpart.substring(FILES_PREFIX.length);
    }
    return pathpart;
  }

  getFullPath(filename: string): string {
    let normalizedFilename = this.stripFilesPrefix(filename);
    return `${this.collectionPath}/${normalizedFilename}`;
  }

  async readFile(filename: string, referenceType?: FileReferenceType): Promise<FileReference> {
    try {
      const fileRef = ref(this.storage, this.getFullPath(filename));
      // Used as a cache key, not the real endpoint URL
      const fakeDownloadUrlRequestEndpoint = `https://${fileRef.bucket}/${fileRef.fullPath}`;
      // check if the file download URL is cached
      let downloadUrlResponse = await this.cache.resolve(
        fakeDownloadUrlRequestEndpoint,
        async () => await getDownloadURL(fileRef),
        60 * 60 * 24 // one day
      )
      const url = await downloadUrlResponse.text();
      if (referenceType === 'url') {
        return { type: 'url', url }
      }
      const response = await this.cache.resolve(url);
      return { type: 'blob', blob: await response.blob() };
    } catch (e: any) {
      throw normalizeFirebaseReadError(e, this.launchParameters.instance, this.collectionPath, 'firebase-storage');
    }
  }

  async writeFile(
    filename: string,
    contents: Blob,
    metadata?: Record<string, string>,
    uploadEventHandlerCallbackMap?: CallbackMap<UploadEventHandler>): Promise<CallbackMap<UploadController>> {
    const uploadEventHandler = uploadEventHandlerCallbackMap ? this.rpcCallbackManager.makeStubObject(uploadEventHandlerCallbackMap) : undefined;
    const fileRef = ref(this.storage, this.getFullPath(filename));
    const uploadTask = uploadBytesResumable(fileRef, contents, metadata);
    let uploadControllerCallbackMap: CallbackMap<UploadController> | undefined = undefined;
    uploadTask.on(
      'state_changed',
      // next (aka progress)
      snapshot => {
        if (uploadEventHandler && ('onProgress' in uploadEventHandler)) {
          uploadEventHandler.onProgress!(snapshot.bytesTransferred);
        }
      },
      // error
      error => {
        if (uploadEventHandler && ('onError' in uploadEventHandler)) {
          // TODO: provide error message containing instance and collection
          // to help debug tiddlybase-config.json issues
          uploadEventHandler.onError!({
            message: error.message,
            name: error.name,
            code: error.code
          });
          uploadEventHandler?.cleanupRPC();
        }
      },
      // complete
      () => {
        if (uploadControllerCallbackMap) {
          this.rpcCallbackManager.unregisterObject(uploadControllerCallbackMap);
        }
        if (uploadEventHandler && ('onComplete' in uploadEventHandler)) {
          uploadEventHandler.onComplete!();
        }
        uploadEventHandler?.cleanupRPC();
      }
    );
    uploadControllerCallbackMap = this.rpcCallbackManager.registerObject(uploadTask, ['pause', 'cancel', 'resume']);
    return uploadControllerCallbackMap;
  }

  async deleteFile(filename: string): Promise<void> {
    const fileRef = ref(this.storage, this.getFullPath(filename));
    return deleteObject(fileRef);
  }
}
