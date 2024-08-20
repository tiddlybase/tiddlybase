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


const getTiddlerStorage = async (
  launchParameters: LaunchParameters,
  spec: TiddlerStorageSpec,
  lazyFirebaseApp: Lazy<FirebaseApp>,
  rpcCallbackManager: RPCCallbackManager,
  tiddlerStorageChangeListener: TiddlerStorageChangeListener
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
        tiddlerStorageChangeListener
      );
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


export const readTiddlerSources = async (
  launchParameters: LaunchParameters,
  launchConfig: LaunchConfig,
  lazyFirebaseApp: Lazy<FirebaseApp>,
  rpcCallbackManager: RPCCallbackManager,
  tiddlerStorageChangeListener: TiddlerStorageChangeListener
): Promise<MergedSources> => {
  const sourcePromisesWithSpecs = launchConfig.tiddlers.storage.reduce(
    (sourcePromisesWithSpecs, spec) => {
      if (evaluateTiddlerStorageUseCondition(spec.useCondition, launchParameters)) {
        sourcePromisesWithSpecs.push({
          spec,
          storage: getTiddlerStorage(
            launchParameters,
            spec,
            lazyFirebaseApp,
            rpcCallbackManager,
            tiddlerStorageChangeListener)
        });
      } else {
        console.log("Disabling tiddler storage due to useCondition", spec);
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
      if (!(title in mergedSources.tiddlers)) {
        // don't allow tiddlers available in earlier collections to be overridden
        // by later collections.
        mergedSources.tiddlers[title] = tiddler;
        mergedSources.provenance[title] = sourcesWithSpecs[sourceIx];
      }
    }
  }

  mergedSources.writeStore = new RoutingProxyTiddlerStorage(mergedSources.provenance, sourcesWithSpecs);
  return mergedSources;
}
