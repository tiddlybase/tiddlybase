import type { TiddlerCollection, TiddlerSource } from "@tiddlybase/shared/src/tiddler-store";
import { fetchJSON, mergeTiddlerArray } from "./tiddler-store-utils";

export class HttpTiddlerSource implements TiddlerSource {
  url: string;
  constructor(url: string) {
    this.url = url

  }
  async getAllTiddlers(): Promise<TiddlerCollection> {
    return mergeTiddlerArray(await fetchJSON(this.url));
  }
}
