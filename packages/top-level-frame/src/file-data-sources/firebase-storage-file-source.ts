import { FileDataSource, FileReference, FileReferenceType } from "@tiddlybase/shared/src/file-data-source";
import { FirebaseStorage, getBlob, getDownloadURL, ref } from '@firebase/storage';

export class FirebaseStorageDataSource implements FileDataSource {
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
}
