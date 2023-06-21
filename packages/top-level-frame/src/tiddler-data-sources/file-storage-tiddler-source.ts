import type { TiddlerCollection, TiddlerDataSource } from "@tiddlybase/shared/src/tiddler-data-source";
import type { FileDataSource } from "@tiddlybase/shared/src/file-data-source";
import { fetchJSON, mergeTiddlerArray } from "./tiddler-store-utils";

export class FileDataSourceTiddlerSource implements TiddlerDataSource {
  fileDataSource: FileDataSource;
  filename: string;
  constructor(fileDataSource:FileDataSource, filename:string) {
    this.fileDataSource = fileDataSource;
    this.filename = filename;
  }
  async getAllTiddlers(): Promise<TiddlerCollection> {
    const fileRef = await this.fileDataSource.readFile(this.filename, 'blob');
    if (fileRef.type === "url") {
      return mergeTiddlerArray(await fetchJSON(fileRef.url));
    }
    // fileRef.type === "blob")
    return mergeTiddlerArray(JSON.parse(await fileRef.blob.text()));
  }
}
