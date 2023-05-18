import type { TiddlerCollection, TiddlerStore } from "@tiddlybase/shared/src/tiddler-store";

export class StubTiddlerStore implements TiddlerStore {

  async getTiddler (title: string) : Promise<$tw.TiddlerFields | undefined> {
    console.log(`StubTiddlerStore.getTiddler("${title}") called`);
    return undefined;
  }
  async setTiddler (tiddler: $tw.TiddlerFields) : Promise<$tw.TiddlerFields> {
    console.log(`StubTiddlerStore.setTiddler() called with`, tiddler);
    return tiddler;
  }
  async deleteTiddler(title: string) : Promise<void> {
    console.log(`StubTiddlerStore.deleteTiddler("${title}") called`);
  }
  async getAllTiddlers () : Promise<TiddlerCollection> {
    console.log(`StubTiddlerStore.getAllTiddlers() called`);
    return {};
  }
}
