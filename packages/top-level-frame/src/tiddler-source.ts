import { TiddlerCollection, TiddlerSource } from "@tiddlybase/shared/src/tiddler-store";
import { FirebaseStorage, getBlob, ref } from '@firebase/storage';
import { LaunchConfig, TiddlerSourceSpec, TiddlybaseConfig, getStorageConfig } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { joinPaths } from '@tiddlybase/shared/src/join-paths';
import { FirebaseAPIs } from "./types";
import { DEFAULT_TIDDLER_COLLECTION_FILENAME } from "@tiddlybase/shared/src/constants";
import { FirestoreTiddlerStore } from "./firestore-tiddler-store";
import { APIClient } from "@tiddlybase/rpc/src";
import { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";

export class FirebaseStorageTiddlerSource implements TiddlerSource {
  storage: FirebaseStorage;
  path: string;
  constructor(storage: FirebaseStorage, path: string) {
    this.storage = storage;
    this.path = path;
  }
  async getAllTiddlers(): Promise<Record<string, $tw.TiddlerFields>> {
    const fileRef = ref(this.storage, this.path);
    const blob = await getBlob(fileRef);
    const text = await blob.text()
    return JSON.parse(text);
  }
}

export class HttpTiddlerSource implements TiddlerSource {
  url: string;
  constructor(url: string) {
    this.url = url

  }
  async getAllTiddlers(): Promise<Record<string, $tw.TiddlerFields>> {
    return await (await (fetch(this.url))).json();
  }
}

const getTiddlerSource = (tiddlybaseConfig: TiddlybaseConfig, spec: TiddlerSourceSpec, apis: FirebaseAPIs, sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>): TiddlerSource => {
  switch (spec.type) {
    case "http":
      return new HttpTiddlerSource(spec.url);
    case "firebase-storage":
      const storageConfig = getStorageConfig(tiddlybaseConfig);
      const fullPath = joinPaths(storageConfig.tiddlerCollectionsPath, spec.pathPostfix ?? DEFAULT_TIDDLER_COLLECTION_FILENAME)
      if (!apis.storage) {
        throw new Error('Firebase storage required by tiddler source in launch config, but is uninitialized');
      }
      return new FirebaseStorageTiddlerSource(apis.storage, fullPath);
    case "tiddlyweb":
      throw new Error("Tiddler source tiddlyweb not yet supported!")
    case "firestore":
      if (!apis.firestore) {
        throw new Error('Firestore DB required by tiddler source in launch config, but is uninitialized');
      }
      const firestoreTiddlerStore = new FirestoreTiddlerStore(apis.firestore, sandboxedAPIClient, tiddlybaseConfig.instanceName, spec.collection);
      firestoreTiddlerStore.startListening();
      return firestoreTiddlerStore;
    default:
      throw new Error(`Tiddler source spec unrecognized!`)
  }
}

export const readTiddlerSources = async (tiddlybaseConfig: TiddlybaseConfig, launchConfig: LaunchConfig, apis: FirebaseAPIs, sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>) => {
  const sources = launchConfig.sources.map(spec => getTiddlerSource(tiddlybaseConfig, spec, apis, sandboxedAPIClient));
  const collections = await Promise.all(sources.map(source => source.getAllTiddlers()));
  const mergedCollection = collections.reduce((merged:TiddlerCollection, currentCollection:TiddlerCollection):TiddlerCollection => {
    return Object.assign(merged, currentCollection);
  }, {});
  return {
    tiddlers: mergedCollection,
    sources
  }
}
