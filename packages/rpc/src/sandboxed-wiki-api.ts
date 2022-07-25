import {} from "@tiddlybase/tw5-types/src/index"

export interface SandboxedWikiAPIForTopLevel {
  testParentChild: (message:string)=>Promise<void>;
}
