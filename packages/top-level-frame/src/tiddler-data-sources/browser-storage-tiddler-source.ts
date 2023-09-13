import { TiddlerCollection, WritableTiddlerDataSource } from "@tiddlybase/shared/src/tiddler-data-source";
import { LaunchParameters } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { uriEncodeLaunchParameters } from "./tiddler-store-utils";
import mustache from 'mustache'

const KEY_SEPARATOR = "/";
const KEY_PREFIX = "tiddlybase";
export const DEFAULT_PATH_TEMPLATE = `${KEY_PREFIX}/{{instance}}/{{collection}}`

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
  launchParameters: LaunchParameters;
  collectionPath: string;
  collection: string;

  constructor(
    launchParameters: LaunchParameters,
    storage: Storage,
    collection?: string,
    pathTemplate?: string) {
    this.storage = storage;
    this.launchParameters = uriEncodeLaunchParameters(launchParameters);
    this.collection = encodeURIComponent(collection ?? "");
    this.collectionPath = mustache.render(pathTemplate ?? DEFAULT_PATH_TEMPLATE, {
      ...this.launchParameters,
      collection: this.collection
    })
  }

  private makeKey (title:string):string {
    return `${this.collectionPath}/${encodeURIComponent(title)}`;
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
        if (instance === this.launchParameters.instance && collection === this.collection) {
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
