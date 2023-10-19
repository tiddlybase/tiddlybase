import { TiddlerStorageChangeListener, TiddlerCollection, TiddlerProvenance, TiddlerStorageWithSpec, TiddlerStorage } from "@tiddlybase/shared/src/tiddler-storage";
import { LaunchConfig, LaunchParameters, TiddlerStorageSpec } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { FirestoreTiddlerStorage } from "./firestore-tiddler-storage";
import { APIClient } from "@tiddlybase/rpc/src/types";
import { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import { RoutingProxyTiddlerStorage } from "./routing-proxy-tiddler-storage";
import { BrowserTiddlerStorage } from "./browser-tiddler-storage";
import { TiddlyWebTiddlerStorage } from "./tiddlyweb-tiddler-storage";
import { FirebaseApp } from '@firebase/app'
import { getStorage } from '@firebase/storage';
import { getFirestore } from "firebase/firestore";
import { Lazy } from "@tiddlybase/shared/src/lazy";
import { HttpFileStorage } from "../file-storage/http-file-source";
import { FileStorageTiddlerStorage } from "./file-storage-tiddler-storage";
import { FirebaseStorageFileStorage } from "../file-storage/firebase-storage-file-storage";
import { RPC } from "../types";
import { TIDDLYBASE_LOCAL_STATE_PREFIX } from "@tiddlybase/shared/src/constants";
import { LiteralTiddlerStorage } from "./literal-tiddler-storage";
import { evaluateTiddlerStorageUseCondition } from "packages/shared/src/tiddler-storage-conditions";
import { ReadOnlyTiddlerStorageWrapper } from "./tiddler-storage-base";


export class ProxyToSandboxedIframeChangeListener implements TiddlerStorageChangeListener {
  sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>;

  constructor(sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>) {
    this.sandboxedAPIClient = sandboxedAPIClient;
  }

  onSetTiddler(tiddler: $tw.TiddlerFields): void {
    if (tiddler.title.startsWith(TIDDLYBASE_LOCAL_STATE_PREFIX)) {
      console.log(`Ignoring update to tiddler ${tiddler.title} due to TIDDLYBASE_LOCAL_STATE_PREFIX title prefix`, tiddler)
      return;
    }
    this.sandboxedAPIClient('onSetTiddler', [tiddler]);
  }
  onDeleteTiddler(title: string): void {
    if (title.startsWith(TIDDLYBASE_LOCAL_STATE_PREFIX)) {
      console.log(`Ignoring delete tiddler ${title} due to TIDDLYBASE_LOCAL_STATE_PREFIX title prefix`)
      return;
    }
    this.sandboxedAPIClient('onDeleteTiddler', [title]);
  }
}

const getTiddlerStorage = async (launchParameters: LaunchParameters, spec: TiddlerStorageSpec, lazyFirebaseApp: Lazy<FirebaseApp>, rpc: RPC): Promise<TiddlerStorage> => {
  switch (spec.type) {
    case "http":
      return new ReadOnlyTiddlerStorageWrapper(
      new FileStorageTiddlerStorage(
        new HttpFileStorage(spec.url), ''));
    case "firebase-storage":
      const gcpStorage = getStorage(lazyFirebaseApp());
      return new ReadOnlyTiddlerStorageWrapper(
        new FileStorageTiddlerStorage(
        new FirebaseStorageFileStorage(
          launchParameters,
          gcpStorage,
          rpc.rpcCallbackManager,
          spec.collection,
          spec.pathTemplate
        ),
        spec.filename));
    case "browser-storage":
      const browserStorage = spec.useLocalStorage === true ? window.localStorage : window.sessionStorage;
      return new BrowserTiddlerStorage(
        spec.writeCondition,
        launchParameters,
        browserStorage,
        spec.collection,
        spec.pathTemplate)
    case "tiddlyweb":
      return new TiddlyWebTiddlerStorage(spec.writeCondition);
    case "firestore":
      const firestore = getFirestore(lazyFirebaseApp());
      const firestoreTiddlerStore = new FirestoreTiddlerStorage(
        spec.writeCondition,
        launchParameters,
        firestore,
        spec.collection,
        spec.pathTemplate,
        spec.options,
        // TODO: only notify the client if the affected tiddler is not overridden
        // by another TiddlerStorage according to tiddler provenance.
        new ProxyToSandboxedIframeChangeListener(rpc.sandboxedAPIClient));
      await firestoreTiddlerStore.startListening();
      return firestoreTiddlerStore;
    case "literal":
      return new ReadOnlyTiddlerStorageWrapper(new LiteralTiddlerStorage(spec.tiddlers));
    default:
      throw new Error(`Tiddler source spec unrecognized!`)
  }
}

export type MergedSources = {
  tiddlers: TiddlerCollection;
  provenance: TiddlerProvenance;
  writeStore?: TiddlerStorage;
}

type TiddlerSourcePromiseWithSpec = {
  storage: Promise<TiddlerStorage>;
  spec: TiddlerStorageSpec;
}


export const readTiddlerSources = async (launchParameters: LaunchParameters, launchConfig: LaunchConfig, lazyFirebaseApp: Lazy<FirebaseApp>, rpc: RPC): Promise<MergedSources> => {
  const sourcePromisesWithSpecs = launchConfig.tiddlers.storage.reduce(
    (sourcePromisesWithSpecs, spec) => {
      if (evaluateTiddlerStorageUseCondition(spec.useCondition, launchParameters)) {
        sourcePromisesWithSpecs.push({
          spec,
          storage: getTiddlerStorage(launchParameters, spec, lazyFirebaseApp, rpc)
        });
      } else {
        console.log("Disabling data source due to useCondition", spec);
      }
      return sourcePromisesWithSpecs;
    }, [] as TiddlerSourcePromiseWithSpec[]);
  const collections = await Promise.all(sourcePromisesWithSpecs.map(async s => {
    try {
      return await (await s.storage).getAllTiddlers();
    } catch (e: any) {
      // attach spec which failed to load to the exception for debugging purposes.
      e.spec = s.spec;
      throw (e);
    }
  }));
  const sourcesWithSpecs: TiddlerStorageWithSpec[] = await Promise.all(sourcePromisesWithSpecs.map(async s => ({
    ...s,
    storage: await s.storage
  })));
  const mergedSources: MergedSources = { tiddlers: {}, provenance: {} };
  for (let sourceIx = 0; sourceIx < sourcePromisesWithSpecs.length; sourceIx++) {
    for (let [title, tiddler] of Object.entries(collections[sourceIx])) {
      mergedSources.tiddlers[title] = tiddler;
      mergedSources.provenance[title] = sourcesWithSpecs[sourceIx];
    }
  }

  mergedSources.writeStore = new RoutingProxyTiddlerStorage(mergedSources.provenance, sourcesWithSpecs);
  return mergedSources;
}
