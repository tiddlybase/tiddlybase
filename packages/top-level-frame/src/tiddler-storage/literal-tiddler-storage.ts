
import type {} from "@tiddlybase/tw5-types/src/index";
import type { TiddlerCollection } from "@tiddlybase/shared/src/tiddler-storage";
import { mergeTiddlerArray } from "./tiddler-storage-utils";
import {TiddlerReadOnlyStorageBase} from './tiddler-storage-base'
import { LaunchParameters, PinTiddlerToStorageCondition } from "packages/shared/src/tiddlybase-config-schema";

export class LiteralTiddlerStorage extends TiddlerReadOnlyStorageBase {
  constructor(
    launchParamters: LaunchParameters,
    pinCondition: PinTiddlerToStorageCondition|undefined,
    private tiddlers:$tw.TiddlerFields[]) {
      super(launchParamters, pinCondition)
  }
  async getAllTiddlers(): Promise<TiddlerCollection> {
    return mergeTiddlerArray(this.tiddlers);
  }
}
