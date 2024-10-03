import { TiddlerCollection, TiddlerProvenance, TiddlerStorageWithSpec, TiddlerStorage } from "@tiddlybase/shared/src/tiddler-storage";
import type { } from '@tiddlybase/tw5-types/src/index';


export class RoutingProxyTiddlerStorage implements TiddlerStorage {
  provenance: TiddlerProvenance;
  storageWithSpecs: Array<TiddlerStorageWithSpec|undefined>;

  constructor(provenance: TiddlerProvenance, storageWithSpecs: Array<TiddlerStorageWithSpec|undefined>) {
    this.provenance = provenance;
    this.storageWithSpecs = storageWithSpecs;
  }

  private selectStorageForWrite(tiddler: $tw.TiddlerFields, blacklist: undefined | number[] = undefined): TiddlerStorageWithSpec|undefined {
    // Select first candidate with a passing predicate function.
    for (let storageWithSpecs of this.storageWithSpecs) {
      if (
        storageWithSpecs !== undefined &&
        storageWithSpecs.storage.canAcceptTiddler(tiddler) &&
        ((blacklist === undefined) || (!(blacklist.includes(storageWithSpecs.sourceIndex))))
      ) {
        return storageWithSpecs;
      }
    }
    return undefined;
  }

  getTiddler(title: string): Promise<$tw.TiddlerFields | undefined> {
    // TODO
    throw new Error('RoutingProxyTiddlerStore.getTiddler() unimplemented');
  }

  async setTiddler(tiddler: $tw.TiddlerFields): Promise<$tw.TiddlerFields> {
    const failedStorageIndexes:number[] = [];
    // If tiddler already has a storage assigned according to provenance, attempt to write there
    // TODO: cascade to another option if the write fails
    let candidateStorage:TiddlerStorageWithSpec | undefined = undefined;
    if (tiddler.title in this.provenance) {
      const storage = this.storageWithSpecs[this.provenance[tiddler.title]]
      console.log("found tiddler in provenance, checking if existing storage can accept tiddler", storage, tiddler);
      if (storage?.storage.canAcceptTiddler(tiddler)) {
        // read only storages will not accept tiddlers, in this case candidateStorage should remain undefined
        candidateStorage = storage;
      }
    }
    while(true) {
      if (candidateStorage === undefined) {
        candidateStorage = this.selectStorageForWrite(tiddler, failedStorageIndexes);
      }
      if (!candidateStorage) {
        let msg = "Could not find a TiddlerStorage backend to write to!";
        if (failedStorageIndexes.length > 0) {
          msg += ` Attempted storage indexes: ${failedStorageIndexes.join(", ")}`
        }
        throw new Error(msg)
      }

      try {
        const writeResponse = candidateStorage.storage.setTiddler(tiddler);
        // write was successful, update provenance
        this.provenance[tiddler.title] = candidateStorage.sourceIndex;
        return writeResponse
      } catch(e) {
        // there was a write failure, note that this source didn't work and
        // pick another one if the config allows it
        if (candidateStorage.spec.allowWriteFallback === false) {
          throw(e);
        }
        failedStorageIndexes.push(candidateStorage.sourceIndex)
        // If all potential sources are already blacklisted, then the next
        // iteration of the loop will throw an exception after calling
        // selectStorageForWrite
        console.log("Writing tiddler failed, retrying with next storage option", tiddler, candidateStorage);
      }
    }
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
