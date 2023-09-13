import { FileReference, FileReferenceType, UploadController, UploadEventHandler, WritableFileDataSource } from "@tiddlybase/shared/src/file-data-source";
import { FirebaseStorage, getDownloadURL, ref, uploadBytesResumable, deleteObject } from '@firebase/storage';
import { normalizeFirebaseReadError } from "../firebase-utils";
import { CallbackMap } from "@tiddlybase/rpc/src/types";
import { RPCCallbackManager } from "@tiddlybase/rpc/src/rpc-callback-manager";
import { LaunchParameters } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import mustache from 'mustache'
import { uriEncodeLaunchParameters } from "../tiddler-data-sources/tiddler-store-utils";

// TODO: this files prefix should be configurable in the future!
const FILES_PREFIX = "files/"
const DEFAULT_PATH_TEMPLATE = `/{{instance}}/{{collection}}/{{filename}}`

export class FirebaseStorageDataSource implements WritableFileDataSource {
  storage: FirebaseStorage;
  collectionPath: string;
  rpcCallbackManager: RPCCallbackManager;
  launchParameters: LaunchParameters;

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
      const url = await getDownloadURL(fileRef)
      if (referenceType === 'url') {
        return { type: 'url', url }
      }
      return { type: 'blob', blob: await (await fetch(url)).blob() };
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
