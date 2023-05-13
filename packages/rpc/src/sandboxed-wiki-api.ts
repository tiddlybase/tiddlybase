import {} from "@tiddlybase/tw5-types/src/index"
import type { TiddlerChangeListener } from "@tiddlybase/shared/src/tiddler-store";

export interface SandboxedWikiAPIForTopLevel extends TiddlerChangeListener {
  testParentChild: (message:string)=>Promise<void>;
}
