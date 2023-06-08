import { TiddlerChangeListener, TiddlerCollection, TiddlerProvenance, TiddlerSource, TiddlerSourceWithSpec, TiddlerStore } from "@tiddlybase/shared/src/tiddler-store";

import { LaunchConfig, TiddlerSourceSpec, TiddlybaseClientConfig, getStorageConfig } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { joinPaths } from '@tiddlybase/shared/src/join-paths';
import { FirebaseAPIs } from "../types";
import { DEFAULT_TIDDLER_COLLECTION_FILENAME } from "@tiddlybase/shared/src/constants";
import { FirestoreTiddlerStore } from "./firestore-tiddler-store";
import { APIClient } from "@tiddlybase/rpc/src";
import { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import { RoutingProxyTiddlerStore } from "./routing-proxy-tiddler-store";
import { BrowserStorageTiddlerStore } from "./browser-storage-tiddler-store";
import { TiddlyWebTiddlerStore } from "./tiddlyweb-tiddler-store";
import { HttpTiddlerSource } from "./http-tiddler-source";
import { FirebaseStorageTiddlerSource } from "./firebase-storage-tiddler-source";

export class ProxyToSandboxedIframeChangeListener implements TiddlerChangeListener {
  sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>;

  constructor(sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>) {
    this.sandboxedAPIClient = sandboxedAPIClient;
  }

  onSetTiddler (tiddler: $tw.TiddlerFields): void {
    this.sandboxedAPIClient('onSetTiddler', [tiddler]);
  }
  onDeleteTiddler (title: string): void {
    this.sandboxedAPIClient('onDeleteTiddler', [title]);
  }
}

const substituteUserid = (template: string, userid: string): string => template.replace("$USERID", () => userid);

const getTiddlerSource = async (tiddlybaseClientConfig: TiddlybaseClientConfig, spec: TiddlerSourceSpec, userid: string, apis: FirebaseAPIs, sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>): Promise<TiddlerSource> => {
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
      return new TiddlyWebTiddlerStore({
        filterExpression: spec.filterExpression
      });
    case "firestore":
      if (!apis.firestore) {
        throw new Error('Firestore DB required by tiddler source in launch config, but is uninitialized');
      }
      const firestoreTiddlerStore = new FirestoreTiddlerStore(
        apis.firestore,
        tiddlybaseClientConfig.instanceName,
        substituteUserid(spec.collection, userid),
        spec.options,
        new ProxyToSandboxedIframeChangeListener(sandboxedAPIClient));
      await firestoreTiddlerStore.startListening();
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

type TiddlerSourcePromiseWithSpec = {
  source: Promise<TiddlerSource>;
  spec: TiddlerSourceSpec;
}

export const readTiddlerSources = async (tiddlybaseClientConfig: TiddlybaseClientConfig, launchConfig: LaunchConfig, userid: string, apis: FirebaseAPIs, sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>): Promise<MergedSources> => {
  const sourcePromisesWithSpecs: TiddlerSourcePromiseWithSpec[] = launchConfig.sources.map(spec => ({ spec, source: getTiddlerSource(tiddlybaseClientConfig, spec, userid, apis, sandboxedAPIClient) }));
  const collections = await Promise.all(sourcePromisesWithSpecs.map(async s => (await s.source).getAllTiddlers()));
  const sourcesWithSpecs: TiddlerSourceWithSpec[] = await Promise.all(sourcePromisesWithSpecs.map(async s => ({
    ...s,
    source: await s.source
  })));
  const mergedSources: MergedSources = { tiddlers: {}, provenance: {} };
  for (let sourceIx = 0; sourceIx < sourcePromisesWithSpecs.length; sourceIx++) {
    for (let [title, tiddler] of Object.entries(collections[sourceIx])) {
      mergedSources.tiddlers[title] = tiddler;
      mergedSources.provenance[title] = sourcesWithSpecs[sourceIx];
    }
  }

  mergedSources.writeStore = new RoutingProxyTiddlerStore(mergedSources.provenance, sourcesWithSpecs);
  return mergedSources;
}
