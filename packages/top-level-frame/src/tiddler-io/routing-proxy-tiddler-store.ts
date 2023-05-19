import { TiddlerCollection, TiddlerProvenance, TiddlerSource, TiddlerSourceWithSpec, TiddlerStore } from "@tiddlybase/shared/src/tiddler-store";
import type { } from '@tiddlybase/tw5-types/src/index'
import { TiddlerSourceSpec, TiddlerWriteCondition } from "@tiddlybase/shared/src/tiddlybase-config-schema";

type PredicateFn = (tiddler: $tw.TiddlerFields) => boolean
const KNOWN_PRIVATE = new Set<string>(['$:/StoryList', '$:/HistoryList', '$:/DefaultTiddlers'])
const PRIVATE_PREFIX = '€:/'

const ALWAYS = (_: $tw.TiddlerFields) => true;

const getConditionPredicate = (writeCondition: TiddlerWriteCondition): PredicateFn => {
  if (writeCondition.titlePrefix) {
    return tiddler => tiddler.title.startsWith(writeCondition.titlePrefix);
  }
  // firestore is the only TiddlerStore currently supported
  throw new Error("Cannot create PredicateFn for specified writeCondition");
};

const getPredicate = (spec: TiddlerSourceSpec) : PredicateFn => {
  if (spec.type === 'firestore') {
    switch (spec.storeType) {
      case 'custom':
        return getConditionPredicate(spec.writeCondition);
      case 'private':
        return tiddler => {
          return KNOWN_PRIVATE.has(tiddler.title) || tiddler.title.startsWith(PRIVATE_PREFIX) || ('draft.of' in tiddler)
        };
      case 'shared':
        return ALWAYS;
    }
  }
  // firestore is the only TiddlerStore currently supported
  throw new Error("Cannot create predicate for spec of type " + spec.type);
}

type CandidateStore = {
  predicate: PredicateFn;
  store: TiddlerStore;
  spec: TiddlerSourceSpec;
};

const isTiddlerStore = (s: TiddlerSource): s is TiddlerStore => {
  return 'setTiddler' in s;
}

const getCandidateStore = (store: TiddlerStore, spec: TiddlerSourceSpec): CandidateStore => {
  let predicate = ALWAYS;
  if ('storeType' in spec) {
    predicate = getPredicate(spec);
  }
  return {
    spec,
    store,
    predicate
  }
}

export class RoutingProxyTiddlerStore implements TiddlerStore {
  provenance: TiddlerProvenance;
  candidateStores: CandidateStore[] = [];
  constructor(provenance: TiddlerProvenance, sourcesWithSpecs: TiddlerSourceWithSpec[]) {
    this.provenance = provenance;
    for (let { source, spec } of sourcesWithSpecs) {
      if (isTiddlerStore(source)) {
        this.candidateStores.push(getCandidateStore(source, spec));
      }
    }
    // TODO: what happens if there are not candidateStores?
  }

  private selectStoreForWrite(tiddler: $tw.TiddlerFields): CandidateStore {
    // Select first candidate with a passing predicate function.
    for (let candidate of this.candidateStores) {
      if (candidate.predicate(tiddler)) {
        return candidate
      }
    }
    throw new Error("No writable store selected");
  }
  getTiddler(title: string): Promise<$tw.TiddlerFields | undefined> {
    // TODO
    throw new Error('RoutingProxyTiddlerStore.getTiddler() unimplemented');
  }
  setTiddler(tiddler: $tw.TiddlerFields): Promise<$tw.TiddlerFields> {
    const candidateStore = this.selectStoreForWrite(tiddler);
    console.log(`RoutingProxyTiddlerStore setTiddler("${tiddler.title}")`, tiddler, candidateStore);
    this.provenance[tiddler.title] = { source: candidateStore.store, spec: candidateStore.spec }
    return candidateStore.store.setTiddler(tiddler);
  }
  async deleteTiddler(title: string): Promise<void> {
    let store = this.provenance[title]?.source;
    if (store && isTiddlerStore(store)) {
      return store.deleteTiddler(title);
    } else {
      // TODO: better handle missing tiddler case
      console.error(`Cannot delete ${title}, no provenance info`);
    }
    return undefined;
  }
  getAllTiddlers(): Promise<TiddlerCollection> {
    //
    throw new Error('RoutingProxyTiddlerStore.getAllTiddlers() unimplemented');
  }
}
