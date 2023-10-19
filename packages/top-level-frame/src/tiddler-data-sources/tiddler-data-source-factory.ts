import { TiddlerDataSourceChangeListener, TiddlerCollection, TiddlerProvenance, TiddlerDataSource, TiddlerDataSourceWithSpec, WritableTiddlerDataSource } from "@tiddlybase/shared/src/tiddler-data-source";
import { LaunchConfig, LaunchParameters, TiddlerDataSourceSpec, TiddlerDataSourceUseConditionAssertion } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { FirestoreDataSource } from "./firestore-tiddler-source";
import { APIClient } from "@tiddlybase/rpc/src/types";
import { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import { RoutingProxyTiddlerSource } from "./routing-proxy-tiddler-source";
import { BrowserStorageDataSource } from "./browser-storage-tiddler-source";
import { TiddlyWebTiddlerStore } from "./tiddlyweb-tiddler-store";
import { FirebaseApp } from '@firebase/app'
import { getStorage } from '@firebase/storage';
import { getFirestore } from "firebase/firestore";
import { Lazy } from "@tiddlybase/shared/src/lazy";
import { HttpFileDataSource } from "../file-data-sources/http-file-source";
import { FileDataSourceTiddlerSource } from "./file-storage-tiddler-source";
import { FirebaseStorageDataSource } from "../file-data-sources/firebase-storage-file-source";
import { RPC } from "../types";
import { TIDDLYBASE_LOCAL_STATE_PREFIX } from "@tiddlybase/shared/src/constants";
import { EvalAssertion, Expression, evalExpression } from "@tiddlybase/shared/src/expressions";
import { LiteralDataSourceTiddlerSource } from "./literal-tiddler-source";

const DEFAULT_USE_CONDITION: Expression<TiddlerDataSourceUseConditionAssertion> = true;

export class ProxyToSandboxedIframeChangeListener implements TiddlerDataSourceChangeListener {
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

const getTiddlerSource = async (launchParameters: LaunchParameters, spec: TiddlerDataSourceSpec, lazyFirebaseApp: Lazy<FirebaseApp>, rpc: RPC): Promise<TiddlerDataSource> => {
  switch (spec.type) {
    case "http":
      return new FileDataSourceTiddlerSource(
        new HttpFileDataSource(spec.url), '');
    case "firebase-storage":
      const gcpStorage = getStorage(lazyFirebaseApp());
      return new FileDataSourceTiddlerSource(
        new FirebaseStorageDataSource(
          launchParameters,
          gcpStorage,
          rpc.rpcCallbackManager,
          spec.collection,
          spec.pathTemplate
        ),
        spec.filename);
    case "browser-storage":
      const browserStorage = spec.useLocalStorage === true ? window.localStorage : window.sessionStorage;
      return new BrowserStorageDataSource(
        launchParameters,
        browserStorage,
        spec.collection,
        spec.pathTemplate)
    case "tiddlyweb":
      return new TiddlyWebTiddlerStore();
    case "firestore":
      const firestore = getFirestore(lazyFirebaseApp());
      const firestoreTiddlerStore = new FirestoreDataSource(
        launchParameters,
        firestore,
        spec.collection,
        spec.pathTemplate,
        spec.options,
        // TODO: only notify the client if the affected tiddler is not overridden
        // by another TiddlerDataSource according to tiddler provenance.
        new ProxyToSandboxedIframeChangeListener(rpc.sandboxedAPIClient));
      await firestoreTiddlerStore.startListening();
      return firestoreTiddlerStore;
    case "literal":
      return new LiteralDataSourceTiddlerSource(spec.tiddlers);
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

const evalUseCondition: EvalAssertion<TiddlerDataSourceUseConditionAssertion, LaunchParameters> = (assertion, launchParameters) => {
  if (typeof assertion === 'boolean') {
    return assertion;
  }
  if (assertion === 'authenticated') {
    return !!launchParameters.userId;
  }
  throw new Error(`unhandled use condition assertion: ${JSON.stringify(assertion)}`);
}

export const readTiddlerSources = async (launchParameters: LaunchParameters, launchConfig: LaunchConfig, lazyFirebaseApp: Lazy<FirebaseApp>, rpc: RPC): Promise<MergedSources> => {
  const sourcePromisesWithSpecs = launchConfig.tiddlers.sources.reduce(
    (sourcePromisesWithSpecs, spec) => {
      if (evalExpression(
        evalUseCondition,
        spec.useCondition ?? DEFAULT_USE_CONDITION,
        launchParameters
      )) {
        sourcePromisesWithSpecs.push({
          spec,
          source: getTiddlerSource(launchParameters, spec, lazyFirebaseApp, rpc)
        });
      } else {
        console.log("Disabling data source due to useCondition", spec);
      }
      return sourcePromisesWithSpecs;
    }, [] as TiddlerSourcePromiseWithSpec[]);
  const collections = await Promise.all(sourcePromisesWithSpecs.map(async s => {
    try {
      return await (await s.source).getAllTiddlers();
    } catch (e: any) {
      // attach spec which failed to load to the exception for debugging purposes.
      e.spec = s.spec;
      throw (e);
    }
  }));
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
