import { TiddlerCollection, TiddlerProvenance, TiddlerSource, TiddlerSourceWithSpec, TiddlerStore } from "@tiddlybase/shared/src/tiddler-store";
import { FirebaseStorage, getBlob, ref } from '@firebase/storage';
import { LaunchConfig, TiddlerSourceSpec, TiddlybaseClientConfig, getStorageConfig } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { joinPaths } from '@tiddlybase/shared/src/join-paths';
import { FirebaseAPIs } from "../types";
import { DEFAULT_TIDDLER_COLLECTION_FILENAME } from "@tiddlybase/shared/src/constants";
import { FirestoreTiddlerStore } from "./firestore-tiddler-store";
import { APIClient } from "@tiddlybase/rpc/src";
import { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import { RoutingProxyTiddlerStore } from "./routing-proxy-tiddler-store";
import { BrowserStorageTiddlerStore } from "./browser-storage-tiddler-store";

export const mergeTiddlerArray = (tiddlers: $tw.TiddlerFields[]): TiddlerCollection => tiddlers.reduce((coll, tiddler) => {
  coll[tiddler.title] = tiddler;
  return coll;
}, {} as TiddlerCollection);

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

export class HttpTiddlerSource implements TiddlerSource {
  url: string;
  constructor(url: string) {
    this.url = url

  }
  async getAllTiddlers(): Promise<TiddlerCollection> {
    return mergeTiddlerArray(await (await (fetch(this.url))).json());
  }
}

const substituteUserid = (template: string, userid: string): string => template.replace("$USERID", () => userid);

const getTiddlerSource = (tiddlybaseClientConfig: TiddlybaseClientConfig, spec: TiddlerSourceSpec, userid: string, apis: FirebaseAPIs, sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>): TiddlerSource => {
  switch (spec.type) {
    case "http":
      return new HttpTiddlerSource(spec.url);
    case "firebase-storage":
      const storageConfig = getStorageConfig(tiddlybaseClientConfig);
      const fullPath = joinPaths(storageConfig.tiddlerCollectionsPath, spec.pathPostfix ?? DEFAULT_TIDDLER_COLLECTION_FILENAME)
      if (!apis.storage) {
        throw new Error('Firebase storage required by tiddler source in launch config, but is uninitialized');
      }
      return new FirebaseStorageTiddlerSource(apis.storage, fullPath);
    case "browser-storage":
      return new BrowserStorageTiddlerStore(spec.useLocalStorage === true ? window.localStorage : window.sessionStorage, tiddlybaseClientConfig.instanceName, spec.collection)
    case "tiddlyweb":
      throw new Error("Tiddler source tiddlyweb not yet supported!")
    case "firestore":
      if (!apis.firestore) {
        throw new Error('Firestore DB required by tiddler source in launch config, but is uninitialized');
      }
      const firestoreTiddlerStore = new FirestoreTiddlerStore(apis.firestore, sandboxedAPIClient, tiddlybaseClientConfig.instanceName, substituteUserid(spec.collection, userid), spec.options);
      firestoreTiddlerStore.startListening();
      return firestoreTiddlerStore;
    default:
      throw new Error(`Tiddler source spec unrecognized!`)
  }
}

export type MergedSources = {
  tiddlers: TiddlerCollection;
  provenance: TiddlerProvenance;
  writeStore?: TiddlerStore;
}
export const readTiddlerSources = async (tiddlybaseClientConfig: TiddlybaseClientConfig, launchConfig: LaunchConfig, userid: string, apis: FirebaseAPIs, sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>): Promise<MergedSources> => {
  const sourcesWithSpecs: TiddlerSourceWithSpec[] = launchConfig.sources.map(spec => ({ spec, source: getTiddlerSource(tiddlybaseClientConfig, spec, userid, apis, sandboxedAPIClient) }));
  const collections = await Promise.all(sourcesWithSpecs.map(s => s.source.getAllTiddlers()));
  const mergedSources: MergedSources = { tiddlers: {}, provenance: {} };
  for (let sourceIx = 0; sourceIx < sourcesWithSpecs.length; sourceIx++) {
    for (let [title, tiddler] of Object.entries(collections[sourceIx])) {
      mergedSources.tiddlers[title] = tiddler;
      mergedSources.provenance[title] = sourcesWithSpecs[sourceIx];
    }
  }

  mergedSources.writeStore = new RoutingProxyTiddlerStore(mergedSources.provenance, sourcesWithSpecs);
  return mergedSources;
}
