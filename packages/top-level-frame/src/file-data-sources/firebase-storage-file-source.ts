import { FileReference, FileReferenceType, WritableFileDataSource } from "@tiddlybase/shared/src/file-data-source";
import { FirebaseStorage, getBlob, getDownloadURL, ref, uploadBytes, deleteObject } from '@firebase/storage';
import { normalizeFirebaseReadError } from "../firebase-utils";

export class FirebaseStorageDataSource implements WritableFileDataSource {
  storage: FirebaseStorage;
  instance: string;
  collection: string;

  constructor(storage: FirebaseStorage, instance: string, collection: string) {
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

  async writeFile(filename: string, contents: Blob, metadata?: Record<string, string> | undefined): Promise<number> {
    const fileRef = ref(this.storage, this.getFullPath(filename));
    const result = await uploadBytes(fileRef, contents, metadata);
    return result.metadata.size
  }

  async deleteFile(filename: string):Promise<void> {
    const fileRef = ref(this.storage, this.getFullPath(filename));
    return deleteObject(fileRef);
  }
}
