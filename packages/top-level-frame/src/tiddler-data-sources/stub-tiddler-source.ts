import type { TiddlerCollection, WritableTiddlerDataSource } from "@tiddlybase/shared/src/tiddler-data-source";

export class StubTiddlerSource implements WritableTiddlerDataSource {

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
