
import type { } from "@tiddlybase/tw5-types/src/index";

export interface MDXTiddlybaseAPI {
  readonly currentTiddler: $tw.TiddlerFields | undefined;
  setTiddler(tiddler: $tw.TiddlerFields): $tw.TiddlerFields;
  getTiddler(title: string): $tw.TiddlerFields | undefined;
  updateTiddler: (tiddler: $tw.TiddlerFields) => $tw.TiddlerFields;
  filterTiddlers: (filterExpression: string) => $tw.TiddlerFields[];
}
