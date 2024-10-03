import { TiddlerStorageChangeListener, TiddlerCollection, TiddlerProvenance, TiddlerStorageWithSpec, TiddlerStorage } from "@tiddlybase/shared/src/tiddler-storage";
import { LaunchConfig, LaunchParameters, TiddlerStorageSpec } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { FirestoreTiddlerStorage } from "./firestore-tiddler-storage";
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
import { LiteralTiddlerStorage } from "./literal-tiddler-storage";
import { evaluateTiddlerStorageUseCondition } from "@tiddlybase/shared/src/tiddler-storage-conditions";
import { ReadOnlyTiddlerStorageWrapper } from "./tiddler-storage-base";
import { RPCCallbackManager } from "@tiddlybase/rpc/src/rpc-callback-manager";
import { FirestoreQueryTiddlerStorage } from "./firestore-query-tiddler-storage";
import { ProvenanceUpdatingChangeListenerWrapper } from "../change-listener";

const getClientId = () => Math.ceil(Math.random() * 1000000);

const getTiddlerStorage = async (
  sourceIndex: number,
  provenance: TiddlerProvenance,
  launchParameters: LaunchParameters,
  spec: TiddlerStorageSpec,
  lazyFirebaseApp: Lazy<FirebaseApp>,
  rpcCallbackManager: RPCCallbackManager,
  tiddlerStorageChangeListener: TiddlerStorageChangeListener,
  clientId: number
): Promise<TiddlerStorage> => {
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
            rpcCallbackManager,
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
      return new TiddlyWebTiddlerStorage(launchParameters, spec.writeCondition);
    case "firestore":
      const firestore = getFirestore(lazyFirebaseApp());
      const firestoreTiddlerStore = new FirestoreTiddlerStorage(
        clientId,
        firestore,
        spec.writeCondition,
        launchParameters,
        spec.collection,
        spec.pathTemplate,
        spec.options,
        new ProvenanceUpdatingChangeListenerWrapper(
          tiddlerStorageChangeListener,
          sourceIndex,
          provenance
        )
      );
      await firestoreTiddlerStore.startListening();
      return firestoreTiddlerStore;
    case "literal":
      return new ReadOnlyTiddlerStorageWrapper(new LiteralTiddlerStorage(spec.tiddlers));
    case "firestore-query":
      const storage = new FirestoreQueryTiddlerStorage(
        clientId,
        getFirestore(lazyFirebaseApp()),
        launchParameters,
        spec.query,
        new ProvenanceUpdatingChangeListenerWrapper(
          tiddlerStorageChangeListener,
          sourceIndex,
          provenance
        ),
        spec.writeCondition,
        spec.options
      )
      await storage.startListening();
      return storage;
    default:
      throw new Error(`Tiddler source spec unrecognized!`)
  }
}

export type MergedSources = {
  tiddlers: TiddlerCollection;
  provenance: TiddlerProvenance;
  writeStore?: TiddlerStorage;
  sourcesWithSpecs: (TiddlerStorageWithSpec | undefined)[];
}

type TiddlerSourcePromiseWithSpec = {
  sourceIndex: number;
  storage: Promise<TiddlerStorage>;
  spec: TiddlerStorageSpec;
}


export const readTiddlerSources = async (
  launchParameters: LaunchParameters,
  launchConfig: LaunchConfig,
  lazyFirebaseApp: Lazy<FirebaseApp>,
  rpcCallbackManager: RPCCallbackManager,
  tiddlerStorageChangeListener: TiddlerStorageChangeListener
): Promise<MergedSources> => {
  const provenance: TiddlerProvenance = {};
  const clientId = getClientId()
  const sourcePromisesWithSpecs = launchConfig.tiddlers.storage.reduce(
    (sourcePromisesWithSpecs, spec, sourceIndex) => {
      if (evaluateTiddlerStorageUseCondition(spec.useCondition, launchParameters)) {
        sourcePromisesWithSpecs.push({
          sourceIndex,
          spec,
          storage: getTiddlerStorage(
            sourceIndex,
            provenance,
            launchParameters,
            spec,
            lazyFirebaseApp,
            rpcCallbackManager,
            tiddlerStorageChangeListener,
            clientId
          )
        });
      } else {
        console.log("Disabling tiddler storage due to useCondition", spec);
        sourcePromisesWithSpecs.push(undefined)
      }
      return sourcePromisesWithSpecs;
    }, [] as Array<TiddlerSourcePromiseWithSpec|undefined>);
  const collections = await Promise.all(sourcePromisesWithSpecs.map(async s => {
    try {
      return s ? await (await s.storage).getAllTiddlers() : Promise.resolve({});
    } catch (e: any) {
      // attach spec which failed to load to the exception for debugging purposes.
      if (s) {
        e.spec = s.spec;
      }
      throw (e);
    }
  }));
  const sourcesWithSpecs: Array<undefined|TiddlerStorageWithSpec> = await Promise.all(sourcePromisesWithSpecs.map(async s => {
    if (s === undefined) {
      return s
    }
    return {
      sourceIndex: s.sourceIndex,
      storage: await s.storage,
      spec: s.spec,
    }
  }));
  const mergedSources: MergedSources = { tiddlers: {}, provenance, sourcesWithSpecs};
  for (let source of sourcesWithSpecs) {
    if (source !== undefined) {
      for (let [title, tiddler] of Object.entries(collections[source.sourceIndex])) {
        if (!(title in mergedSources.tiddlers)) {
          // don't allow tiddlers available in earlier collections to be overridden
          // by later collections.
          mergedSources.tiddlers[title] = tiddler;
          mergedSources.provenance[title] = source.sourceIndex;
        }
      }
    }
  }

  mergedSources.writeStore = new RoutingProxyTiddlerStorage(
    mergedSources.provenance,
    sourcesWithSpecs
  );
  return mergedSources;
}
