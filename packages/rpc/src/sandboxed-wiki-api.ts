import {} from "@tiddlybase/tw5-types/src/index"
import type { TiddlerStorageChangeListener } from "@tiddlybase/shared/src/tiddler-storage";

export interface SandboxedWikiAPIForTopLevel extends TiddlerStorageChangeListener {
  testParentChild: (message:string)=>Promise<void>;
}
