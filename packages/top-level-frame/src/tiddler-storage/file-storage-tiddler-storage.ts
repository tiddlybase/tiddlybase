import type { TiddlerCollection } from "@tiddlybase/shared/src/tiddler-storage";
import type { ReadOnlyFileStorage } from "@tiddlybase/shared/src/file-storage";
import { fetchJSON, mergeTiddlerArray } from "./tiddler-storage-utils";
import {TiddlerReadOnlyStorageBase} from "./tiddler-storage-base";
import { LaunchParameters, PinTiddlerToStorageCondition } from "packages/shared/src/tiddlybase-config-schema";

export class FileStorageTiddlerStorage extends TiddlerReadOnlyStorageBase {
  constructor(
    launchParameters: LaunchParameters,
    pinTiddlerCondition: PinTiddlerToStorageCondition|undefined,
    private fileStorage:ReadOnlyFileStorage,
    private filename:string,
  ) {
    super(launchParameters, pinTiddlerCondition);
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
