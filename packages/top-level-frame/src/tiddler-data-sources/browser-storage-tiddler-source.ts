import { TiddlerCollection, WritableTiddlerDataSource } from "@tiddlybase/shared/src/tiddler-data-source";

const KEY_SEPARATOR = "/";
const KEY_PREFIX = "tiddlybase";

// based on: https://stackoverflow.com/a/3138591
export const forAllKeys = (storage: Storage, fn: (key: string) => void): void => {
  for (let i = 0; i < storage.length; i++) {
    let key = storage.key(i);
    if (key !== null) {
      fn(key);
    }
  }
}

// instance, collection, title
type KeyParts = [string, string, string];

const parseKey = (key:string):KeyParts|undefined => {
  const parts =  key.split(KEY_SEPARATOR);
  if (parts.length === 4 && parts[0] === KEY_PREFIX) {
    return parts.slice(1).map(decodeURIComponent) as KeyParts
  }
  return undefined;
}

export class BrowserStorageDataSource implements WritableTiddlerDataSource {
  storage: Storage;
  tiddlybaseInstanceName: string;
  tiddlerCollectionName: string;
  constructor(storage: Storage, tiddlybaseInstanceName: string, tiddlerCollectionName: string) {
    this.storage = storage;
    this.tiddlybaseInstanceName = tiddlybaseInstanceName;
    this.tiddlerCollectionName = tiddlerCollectionName;
  }

  private makeKey (title:string):string {
    return [KEY_PREFIX, this.tiddlybaseInstanceName, this.tiddlerCollectionName, title].map(encodeURIComponent).join(KEY_SEPARATOR);
  }

  private getTiddlerSync (title: string): $tw.TiddlerFields | undefined {
    const serialized = this.storage.getItem(this.makeKey(title));
    if (serialized) {
      return JSON.parse(serialized)
    }
    return undefined;
  }

  getTiddler (title: string): Promise<$tw.TiddlerFields | undefined> {
    return Promise.resolve(this.getTiddlerSync(title));
  }

  setTiddler (tiddler: $tw.TiddlerFields): Promise<$tw.TiddlerFields> {
    this.storage.setItem(this.makeKey(tiddler.title), JSON.stringify(tiddler));
    return Promise.resolve(tiddler);
  }

  async deleteTiddler (title: string): Promise<void> {
    this.storage.removeItem(this.makeKey(title));
  }

  getAllTiddlers (): Promise<TiddlerCollection> {
    const allTiddlers:TiddlerCollection = {};
    forAllKeys(this.storage, key => {
      const keyParts = parseKey(key);
      if (keyParts) {
        const [instance, collection, title] = keyParts;
        if (instance === this.tiddlybaseInstanceName && collection === this.tiddlerCollectionName) {
          const tiddler = this.getTiddlerSync(title);
          if (tiddler) {
            allTiddlers[tiddler.title] = tiddler
          }
        }
      }
    })
    return Promise.resolve(allTiddlers);
  }
}
