
import type {} from "@tiddlybase/tw5-types/src/index";
import type { TiddlerCollection, ReadOnlyTiddlerStorage } from "@tiddlybase/shared/src/tiddler-storage";
import { mergeTiddlerArray } from "./tiddler-store-utils";

export class LiteralTiddlerStorage implements ReadOnlyTiddlerStorage {
  tiddlers: $tw.TiddlerFields[];
  constructor(tiddlers:$tw.TiddlerFields[]) {
    this.tiddlers = tiddlers;
  }
  async getAllTiddlers(): Promise<TiddlerCollection> {
    return mergeTiddlerArray(this.tiddlers);
  }
}
