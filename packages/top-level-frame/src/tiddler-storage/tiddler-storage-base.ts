import { ReadOnlyTiddlerStorage, TiddlerCollection, TiddlerStorage } from "@tiddlybase/shared/src/tiddler-storage";
import { getWriteConditionEvaluator } from "@tiddlybase/shared/src/tiddler-storage-conditions";
import { TiddlerStorageWriteCondition } from "@tiddlybase/shared/src/tiddlybase-config-schema";

export type TiddlerStorageErrorType = 'unsupported-operation' | 'network-error' | 'unauthorized' | 'unknown';

export class TiddlerStorageError extends Error {
  constructor(public code: TiddlerStorageErrorType, message: string) {
      super(message);
  }
}

export class ReadOnlyTiddlerStorageWrapper implements TiddlerStorage {
  wrappedStorage: ReadOnlyTiddlerStorage;
  constructor(wrappedStorage: ReadOnlyTiddlerStorage) {
    this.wrappedStorage = wrappedStorage
  }
  canAcceptTiddler (_tiddler: $tw.TiddlerFields) {
    return false;
  }
  async getTiddler (title: string): Promise<$tw.TiddlerFields | undefined> {
    return (await this.getAllTiddlers())[title];
  }
  setTiddler (_tiddler: $tw.TiddlerFields): Promise<$tw.TiddlerFields> {
    throw new TiddlerStorageError('unsupported-operation', 'setTiddler() not available on read-only tiddler storage instance');
  }
  deleteTiddler (title: string): Promise<void> {
    throw new TiddlerStorageError('unsupported-operation', 'deleteTiddler() not available on read-only tiddler storage instance');
  }
  getAllTiddlers (): Promise<TiddlerCollection> {
    return this.wrappedStorage.getAllTiddlers();
  }

}


export abstract class TiddlerStorageBase implements TiddlerStorage {
  writeConditionEvaluator: (tiddler: $tw.TiddlerFields) => boolean;
  constructor(writeCondition?: TiddlerStorageWriteCondition ) {
    this.writeConditionEvaluator = getWriteConditionEvaluator(writeCondition)
  }
  canAcceptTiddler (tiddler: $tw.TiddlerFields): boolean {
    return this.writeConditionEvaluator(tiddler);
  }
  abstract getTiddler (title: string): Promise<$tw.TiddlerFields | undefined>;
  abstract setTiddler (tiddler: $tw.TiddlerFields): Promise<$tw.TiddlerFields>;
  abstract deleteTiddler (title: string): Promise<void>;
  abstract getAllTiddlers (): Promise<TiddlerCollection>;
}
