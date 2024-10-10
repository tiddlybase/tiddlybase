import { ReadOnlyTiddlerStorage, TiddlerCollection, TiddlerStorage } from "@tiddlybase/shared/src/tiddler-storage";
import { ALWAYS_FALSE_CONDITION, getPinTiddlerConditionEvaluator, getWriteConditionEvaluator } from "./tiddler-storage-conditions";
import { LaunchParameters, PinTiddlerToStorageCondition, TiddlerStorageWriteCondition } from "@tiddlybase/shared/src/tiddlybase-config-schema";

export type TiddlerStorageErrorType = 'unsupported-operation' | 'network-error' | 'unauthorized' | 'unknown';

export class TiddlerStorageError extends Error {
  constructor(public code: TiddlerStorageErrorType, message: string) {
      super(message);
  }
}

export abstract class TiddlerReadOnlyStorageBase  implements ReadOnlyTiddlerStorage {
  pintTiddlerConditionEvaluator: (tiddler: $tw.TiddlerFields, launchParameters: LaunchParameters) => boolean;
  constructor(protected launchParameters: LaunchParameters, protected pinTiddlerCondition?: PinTiddlerToStorageCondition) {
    this.pintTiddlerConditionEvaluator = getPinTiddlerConditionEvaluator(this.pinTiddlerCondition ?? ALWAYS_FALSE_CONDITION)
  }
  abstract getAllTiddlers (): Promise<TiddlerCollection>;
  isTiddlerPinned (tiddler: $tw.TiddlerFields): boolean {
    return this.pintTiddlerConditionEvaluator(tiddler, this.launchParameters);
  }

}

export class ReadOnlyTiddlerStorageWrapper implements TiddlerStorage {
  constructor(private wrappedStorage: ReadOnlyTiddlerStorage) {

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
  isTiddlerPinned (tiddler: $tw.TiddlerFields): boolean {
    return this.wrappedStorage.isTiddlerPinned(tiddler);
  }

}


export abstract class TiddlerStorageBase extends TiddlerReadOnlyStorageBase implements TiddlerStorage {
  writeConditionEvaluator: (tiddler: $tw.TiddlerFields, launchParameters: LaunchParameters) => boolean;
  constructor(
    launchParameters: LaunchParameters,
    writeCondition?: TiddlerStorageWriteCondition,
    pinCondition?: PinTiddlerToStorageCondition
  ) {
    super(launchParameters, pinCondition);
    this.writeConditionEvaluator = getWriteConditionEvaluator(writeCondition)
  }
  canAcceptTiddler (tiddler: $tw.TiddlerFields): boolean {
    return this.writeConditionEvaluator(tiddler, this.launchParameters);
  }
  abstract getTiddler (title: string): Promise<$tw.TiddlerFields | undefined>;
  abstract setTiddler (tiddler: $tw.TiddlerFields): Promise<$tw.TiddlerFields>;
  abstract deleteTiddler (title: string): Promise<void>;
}
