import {} from "@tiddlybase/tw5-types/src/index"
import type { TiddlerDataSourceChangeListener } from "@tiddlybase/shared/src/tiddler-data-source";

export interface SandboxedWikiAPIForTopLevel extends TiddlerDataSourceChangeListener {
  testParentChild: (message:string)=>Promise<void>;
}
