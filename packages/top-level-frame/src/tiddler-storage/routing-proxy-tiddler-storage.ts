import { TiddlerCollection, TiddlerProvenance, TiddlerStorageWithSpec, TiddlerStorage } from "@tiddlybase/shared/src/tiddler-storage";
import type { } from '@tiddlybase/tw5-types/src/index';


export class RoutingProxyTiddlerStorage implements TiddlerStorage {
  provenance: TiddlerProvenance;
  storageWithSpecs: Array<TiddlerStorageWithSpec|undefined>;

  constructor(provenance: TiddlerProvenance, storageWithSpecs: Array<TiddlerStorageWithSpec|undefined>) {
    this.provenance = provenance;
    this.storageWithSpecs = storageWithSpecs;
  }

  private selectStorageForWrite(tiddler: $tw.TiddlerFields): TiddlerStorageWithSpec|undefined {
    // Select first candidate with a passing predicate function.
    for (let storageWithSpecs of this.storageWithSpecs) {
      if (storageWithSpecs !== undefined && storageWithSpecs.storage.canAcceptTiddler(tiddler)) {
        return storageWithSpecs;
      }
    }
    return undefined;
  }

  getTiddler(title: string): Promise<$tw.TiddlerFields | undefined> {
    // TODO
    throw new Error('RoutingProxyTiddlerStore.getTiddler() unimplemented');
  }

  setTiddler(tiddler: $tw.TiddlerFields): Promise<$tw.TiddlerFields> {
    const candidateStorage = this.selectStorageForWrite(tiddler);
    if (!candidateStorage) {
      throw new Error("Could not find a TiddlerStorage backend to write to!")
    }
    this.provenance[tiddler.title] = candidateStorage.sourceIndex;
    return candidateStorage.storage.setTiddler(tiddler);
  }
  async deleteTiddler(title: string): Promise<void> {
    let storageIndex = this.provenance[title];
    if (storageIndex !== undefined) {
      return this.storageWithSpecs[storageIndex]!.storage.deleteTiddler(title);
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

  canAcceptTiddler (tiddler: $tw.TiddlerFields) {
    return !!this.selectStorageForWrite(tiddler);
  }
}
