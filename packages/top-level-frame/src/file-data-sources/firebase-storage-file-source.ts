import { FileReference, FileReferenceType, UploadController, UploadEventHandler, WritableFileDataSource } from "@tiddlybase/shared/src/file-data-source";
import { FirebaseStorage, getBlob, getDownloadURL, ref, uploadBytesResumable, deleteObject } from '@firebase/storage';
import { normalizeFirebaseReadError } from "../firebase-utils";
import { CallbackMap } from "@tiddlybase/rpc/src/types";
import { RPCCallbackManager } from "@tiddlybase/rpc/src/rpc-callback-manager";

export class FirebaseStorageDataSource implements WritableFileDataSource {
  storage: FirebaseStorage;
  instance: string;
  collection: string;
  rpcCallbackManager: RPCCallbackManager;

  constructor(rpcCallbackManager: RPCCallbackManager, storage: FirebaseStorage, instance: string, collection: string) {
    this.rpcCallbackManager = rpcCallbackManager;
    this.storage = storage;
    this.instance = instance;
    this.collection = collection;
  }

  getFullPath(filename: string): string {
    return `${this.instance}/${this.collection}/${filename}`;
  }
  async readFile(filename: string, referenceType?: FileReferenceType): Promise<FileReference> {
    try {
      const fileRef = ref(this.storage, this.getFullPath(filename));
      if (referenceType === 'url') {
        return {
          type: 'url', url: await getDownloadURL(fileRef)
        }
      }
      return { type: 'blob', blob: await getBlob(fileRef) };
    } catch (e: any) {
      throw normalizeFirebaseReadError(e, this.instance, this.collection, 'firebase-storage');
    }
  }

  async writeFile (
    filename: string,
    contents: Blob,
    metadata?: Record<string, string>,
    uploadEventHandlerCallbackMap?: CallbackMap<UploadEventHandler>): Promise<CallbackMap<UploadController>> {
    const uploadEventHandler = uploadEventHandlerCallbackMap ? this.rpcCallbackManager.makeStubObject(uploadEventHandlerCallbackMap) : undefined;
    const fileRef = ref(this.storage, this.getFullPath(filename));
    const uploadTask = uploadBytesResumable(fileRef, contents, metadata);
    let uploadControllerCallbackMap:CallbackMap<UploadController>|undefined = undefined;
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

  async deleteFile(filename: string):Promise<void> {
    const fileRef = ref(this.storage, this.getFullPath(filename));
    return deleteObject(fileRef);
  }
}
