import {} from "@tiddlybase/tw5-types/src/index"
import { ParentAPIBase } from "./base";
import { TopLevelAPIForWikiSandbox } from "./top-level-api";

export interface WikiSandboxAPIForTopLevel {
  testParentChild: (message:string)=>Promise<void>;
}

type ParentAPIBridged = Pick<TopLevelAPIForWikiSandbox, 'getDownloadURL'>;
type ExposedTW5WikiMethods = Pick<$tw.Wiki, 'getTiddler'>;

export type IsolatedSandboxInitProps = {
  module: string,
  export?: string,
} & Record<string, string>;

export type WikiSandboxAPIForTiddlerSandbox =
  ParentAPIBase<IsolatedSandboxInitProps> &
  ParentAPIBridged &
  ExposedTW5WikiMethods;
