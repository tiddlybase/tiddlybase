import { TiddlerCollection, TiddlerProvenance, TiddlerDataSource, TiddlerDataSourceWithSpec, WritableTiddlerDataSource } from "@tiddlybase/shared/src/tiddler-data-source";
import type { } from '@tiddlybase/tw5-types/src/index'
import type { TiddlerDataSourceSpec, TiddlerWriteConditionAssertion } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { EvalAssertion, Expression, evalExpression } from "packages/shared/src/expressions";

type PredicateFn = (tiddler: $tw.TiddlerFields) => boolean
const KNOWN_PRIVATE = new Set<string>(['$:/StoryList', '$:/HistoryList', '$:/DefaultTiddlers'])
const PRIVATE_PREFIX = '€:/'
const DEFAULT_WRITE_CONDITION: Expression<TiddlerWriteConditionAssertion> = true;

type CandidateDataSource = {
  predicate: PredicateFn;
  source: WritableTiddlerDataSource;
  spec: TiddlerDataSourceSpec;
};

const evalWriteCondition:EvalAssertion<TiddlerWriteConditionAssertion, $tw.TiddlerFields> = (assertion, tiddler) => {
  if (typeof assertion === 'boolean') {
    return assertion;
  }
  if (typeof assertion === 'object') {
    return tiddler.title.startsWith(assertion.titlePrefix);
  }
  if (assertion === 'private') {
    return KNOWN_PRIVATE.has(tiddler.title) || tiddler.title.startsWith(PRIVATE_PREFIX) || ('draft.of' in tiddler)
  }
  throw new Error(`unhandled write condition assertion: ${JSON.stringify(assertion)}`);
}

const isWritableTiddlerDataSource = (s: TiddlerDataSource): s is WritableTiddlerDataSource => {
  return 'setTiddler' in s;
}

export class RoutingProxyTiddlerSource implements WritableTiddlerDataSource {
  provenance: TiddlerProvenance;
  candidateStores: CandidateDataSource[] = [];
  constructor(provenance: TiddlerProvenance, sourcesWithSpecs: TiddlerDataSourceWithSpec[]) {
    this.provenance = provenance;
    for (let { source, spec } of sourcesWithSpecs) {
      if (isWritableTiddlerDataSource(source)) {
        this.candidateStores.push({
          spec,
          source: source,
          predicate: (tiddler: $tw.TiddlerFields) => evalExpression(
            evalWriteCondition,
            spec.writeCondition ?? DEFAULT_WRITE_CONDITION,
            tiddler)
        });
      }
    }
    // TODO: what happens if there are not candidateStores?
  }

  private selectStoreForWrite(tiddler: $tw.TiddlerFields): CandidateDataSource {
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
    this.provenance[tiddler.title] = { source: candidateStore.source, spec: candidateStore.spec }
    return candidateStore.source.setTiddler(tiddler);
  }
  async deleteTiddler(title: string): Promise<void> {
    let store = this.provenance[title]?.source;
    if (store && isWritableTiddlerDataSource(store)) {
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
