import type { TiddlerCollection, ReadOnlyTiddlerStorage } from "@tiddlybase/shared/src/tiddler-storage";
import type { ReadOnlyFileStorage } from "@tiddlybase/shared/src/file-storage";
import { fetchJSON, mergeTiddlerArray } from "./tiddler-storage-utils";

export class FileStorageTiddlerStorage implements ReadOnlyTiddlerStorage {
  fileStorage: ReadOnlyFileStorage;
  filename: string;
  constructor(fileStorage:ReadOnlyFileStorage, filename:string) {
    this.fileStorage = fileStorage;
    this.filename = filename;
  }
  async getAllTiddlers(): Promise<TiddlerCollection> {
    const fileRef = await this.fileStorage.readFile(this.filename, 'blob');
    if (fileRef.type === "url") {
      return mergeTiddlerArray(await fetchJSON(fileRef.url));
    }
    // fileRef.type === "blob")
    return mergeTiddlerArray(JSON.parse(await fileRef.blob.text()));
  }
}
