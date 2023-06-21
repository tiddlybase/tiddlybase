import { TiddlerDataSourceChangeListener, TiddlerCollection, TiddlerProvenance, TiddlerDataSource, TiddlerDataSourceWithSpec, WritableTiddlerDataSource } from "@tiddlybase/shared/src/tiddler-data-source";
import { LaunchConfig, TiddlerDataSourceSpec } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { FirestoreDataSource } from "./firestore-tiddler-source";
import { APIClient } from "@tiddlybase/rpc/src";
import { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import { RoutingProxyTiddlerSource } from "./routing-proxy-tiddler-source";
import { BrowserStorageDataSource } from "./browser-storage-tiddler-source";
import { TiddlyWebTiddlerStore } from "./tiddlyweb-tiddler-store";
import { FirebaseApp } from '@firebase/app'
import { getStorage } from '@firebase/storage';
import { getFirestore } from "firebase/firestore";
import { Lazy } from "@tiddlybase/shared/src/lazy";
import { substituteUserid } from "@tiddlybase/shared/src/users";
import { HttpFileDataSource } from "../file-data-sources/http-file-source";
import { FileDataSourceTiddlerSource } from "./file-storage-tiddler-source";
import { FirebaseStorageDataSource } from "../file-data-sources/firebase-storage-file-source";

export class ProxyToSandboxedIframeChangeListener implements TiddlerDataSourceChangeListener {
  sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>;

  constructor(sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>) {
    this.sandboxedAPIClient = sandboxedAPIClient;
  }

  onSetTiddler(tiddler: $tw.TiddlerFields): void {
    this.sandboxedAPIClient('onSetTiddler', [tiddler]);
  }
  onDeleteTiddler(title: string): void {
    this.sandboxedAPIClient('onDeleteTiddler', [title]);
  }
}

const getTiddlerSource = async (instanceName:string, spec: TiddlerDataSourceSpec, userid: string, lazyFirebaseApp: Lazy<FirebaseApp>, sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>): Promise<TiddlerDataSource> => {
  switch (spec.type) {
    case "http":
      return new FileDataSourceTiddlerSource(
        new HttpFileDataSource(spec.url), '');
    case "firebase-storage":
      const storage = getStorage(lazyFirebaseApp());
      return new FileDataSourceTiddlerSource(
        new FirebaseStorageDataSource(
          storage,
          instanceName,
          spec.collection
        ),
        spec.filename);
    case "browser-storage":
      return new BrowserStorageDataSource(spec.useLocalStorage === true ? window.localStorage : window.sessionStorage, instanceName, spec.collection)
    case "tiddlyweb":
      return new TiddlyWebTiddlerStore();
    case "firestore":
      const firestore = getFirestore(lazyFirebaseApp());
      const firestoreTiddlerStore = new FirestoreDataSource(
        firestore,
        instanceName,
        substituteUserid(spec.collection, userid),
        spec.options,
        // TODO: only notify the client if the affected tiddler is not overridden
        // by another TiddlerDataSource according to tiddler provenance.
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
  writeStore?: WritableTiddlerDataSource;
}

type TiddlerSourcePromiseWithSpec = {
  source: Promise<TiddlerDataSource>;
  spec: TiddlerDataSourceSpec;
}

export const readTiddlerSources = async (instanceName:string, launchConfig: LaunchConfig, userid: string, lazyFirebaseApp: Lazy<FirebaseApp>, sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>): Promise<MergedSources> => {
  const sourcePromisesWithSpecs: TiddlerSourcePromiseWithSpec[] = launchConfig.tiddlers.sources.map(spec => ({ spec, source: getTiddlerSource(instanceName, spec, userid, lazyFirebaseApp, sandboxedAPIClient) }));
  const collections = await Promise.all(sourcePromisesWithSpecs.map(async s => (await s.source).getAllTiddlers()));
  const sourcesWithSpecs: TiddlerDataSourceWithSpec[] = await Promise.all(sourcePromisesWithSpecs.map(async s => ({
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

  mergedSources.writeStore = new RoutingProxyTiddlerSource(mergedSources.provenance, sourcesWithSpecs);
  return mergedSources;
}
