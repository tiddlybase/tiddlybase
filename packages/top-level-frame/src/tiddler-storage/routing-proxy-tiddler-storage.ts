import { TiddlerCollection, TiddlerProvenance, TiddlerStorageWithSpec, TiddlerStorage } from "@tiddlybase/shared/src/tiddler-storage";
import type { } from '@tiddlybase/tw5-types/src/index';

export const exceptIndex = <T>(arr:T[], exceptIndex:number=-1):T[] => {
  return arr.filter((_, ix) => ix != exceptIndex);
}

export class RoutingProxyTiddlerStorage implements TiddlerStorage {

  constructor(private provenance: TiddlerProvenance, private storageWithSpecs: Array<TiddlerStorageWithSpec|undefined>) {
  }

  isTiddlerPinned (tiddler: $tw.TiddlerFields) {
    return false;
  }

  private selectStorageForWrite(tiddler: $tw.TiddlerFields, candidates: (TiddlerStorageWithSpec | undefined)[] | undefined = undefined): TiddlerStorageWithSpec|undefined {
    // Select first candidate with a passing predicate function.
    for (let storageCandidate of (candidates ?? this.storageWithSpecs)) {
      if (
        storageCandidate !== undefined &&
        storageCandidate.storage.canAcceptTiddler(tiddler)
      ) {
        return storageCandidate;
      }
    }
    return undefined;
  }

  getTiddler(title: string): Promise<$tw.TiddlerFields | undefined> {
    // TODO
    throw new Error('RoutingProxyTiddlerStore.getTiddler() unimplemented');
  }

  private getWriteCandidateStorageList(tiddler: $tw.TiddlerFields): (TiddlerStorageWithSpec | undefined)[] {
    if (tiddler.title in this.provenance) {
      // if tiddler already has a storage based on provenance info, attempt to
      // write to this storage first
      const storageIndex = this.provenance[tiddler.title];
      const currentStorage = this.storageWithSpecs[storageIndex];
      console.log("found tiddler in provenance, checking if existing storage can accept tiddler", currentStorage, tiddler);
      let candidates = [currentStorage];
      if (currentStorage && currentStorage.storage.isTiddlerPinned(tiddler)) {
        console.log("tiddler pinned to storage", tiddler, currentStorage);
      } else {
        candidates = candidates.concat(exceptIndex(this.storageWithSpecs, storageIndex));
      }
      return candidates
    }
    return this.storageWithSpecs;
  }

  async setTiddler(tiddler: $tw.TiddlerFields): Promise<$tw.TiddlerFields> {
    const candidateStorages = this.getWriteCandidateStorageList(tiddler);
    const candidateStorage = this.selectStorageForWrite(
      tiddler,
      candidateStorages
      );

    if (!candidateStorage) {
      let msg = "Could not find a TiddlerStorage backend to write to!";
      console.error(msg, candidateStorages);
      // work around a mini-iframe-rpc error where an exception thrown in an
      // rpc registered function is not always returned as failed promise to
      // the caller.
      return Promise.reject(new Error(msg))
    }

    const writeResponse = await candidateStorage.storage.setTiddler(tiddler);
    // write was successful, update provenance
    this.provenance[tiddler.title] = candidateStorage.sourceIndex;
    return writeResponse
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
