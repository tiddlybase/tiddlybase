
import type { } from "@tiddlybase/tw5-types/src/index";

export type TiddlerObject = $tw.TiddlerFields

export interface MDXTiddlybaseAPI {
  readonly currentTiddler: TiddlerObject | undefined;
  getTiddler: (title:string) => TiddlerObject | undefined;
  setTiddler: (tiddler:TiddlerObject) => TiddlerObject;
  updateTiddler: (tiddler:TiddlerObject) => TiddlerObject;
  filterTiddlers: (filterExpression:string) => TiddlerObject[];
}
