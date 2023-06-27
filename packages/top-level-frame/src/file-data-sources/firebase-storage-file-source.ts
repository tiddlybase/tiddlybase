import { FileReference, FileReferenceType, WritableFileDataSource } from "@tiddlybase/shared/src/file-data-source";
import { FirebaseStorage, getBlob, getDownloadURL, ref, uploadBytes } from '@firebase/storage';

export class FirebaseStorageDataSource implements WritableFileDataSource {
  storage: FirebaseStorage;
  instanceName: string;
  collection: string;

  constructor(storage: FirebaseStorage, instanceName: string, collection: string) {
    this.storage = storage;
    this.instanceName = instanceName;
    this.collection = collection;
  }
  getFullPath(filename: string): string {
    return `${this.instanceName}/${this.collection}/${filename}`;
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
    } catch (e) {
      throw { type: "file-read-error", filename, reason: String(e) }
    }
  }

  async writeFile(filename: string, contents: Blob, metadata?: Record<string, string> | undefined): Promise<number> {
    const fileRef = ref(this.storage, this.getFullPath(filename));
    const result = await uploadBytes(fileRef, contents, metadata);
    return result.metadata.size
  }
}
