import { TiddlerCollection, TiddlerSource } from "@tiddlybase/shared/src/tiddler-store";
import { FirebaseStorage, getBlob, ref } from '@firebase/storage';
import { mergeTiddlerArray } from "./tiddler-store-utils";

export class FirebaseStorageTiddlerSource implements TiddlerSource {
  storage: FirebaseStorage;
  path: string;
  constructor(storage: FirebaseStorage, path: string) {
    this.storage = storage;
    this.path = path;
  }
  async getAllTiddlers(): Promise<TiddlerCollection> {
    const fileRef = ref(this.storage, this.path);
    const blob = await getBlob(fileRef);
    const text = await blob.text()
    return mergeTiddlerArray(JSON.parse(text));
  }
}
