
import type {} from "@tiddlybase/tw5-types/src/index";
import type { TiddlerCollection, TiddlerDataSource } from "@tiddlybase/shared/src/tiddler-data-source";
import { mergeTiddlerArray } from "./tiddler-store-utils";

export class LiteralDataSourceTiddlerSource implements TiddlerDataSource {
  tiddlers: $tw.TiddlerFields[];
  constructor(tiddlers:$tw.TiddlerFields[]) {
    this.tiddlers = tiddlers;
  }
  async getAllTiddlers(): Promise<TiddlerCollection> {
    return mergeTiddlerArray(this.tiddlers);
  }
}
