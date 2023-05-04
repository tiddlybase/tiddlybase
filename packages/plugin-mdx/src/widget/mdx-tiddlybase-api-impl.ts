import { TW5ReactContext } from "@tiddlybase/plugin-react/src/components/TW5ReactContext";
import { useContext } from "react";
import { MDXTiddlybaseAPI, TiddlerObject } from "./mdx-tiddlybase-api";

export class MDXTiddlybaseAPIImpl implements MDXTiddlybaseAPI {
  wiki: $tw.Wiki;
  constructor(wiki:$tw.Wiki) {
    this.wiki = wiki;
  }
  get currentTiddler(): TiddlerObject | undefined {
    const context = useContext(TW5ReactContext);
    if (context) {
      const currentTiddlerTitle = context.parentWidget?.getVariable("currentTiddler")
      if (currentTiddlerTitle) {
        return this.getTiddler(currentTiddlerTitle);
      }
    }
    return undefined;
  }
  getTiddler (title: string): TiddlerObject | undefined {
    return this.wiki.getTiddler(title)?.fields;
  }
  filterTiddlers (filterExpression: string): TiddlerObject[] {
    return this.wiki.filterTiddlers(filterExpression)
      .map(title => this.getTiddler(title))
      .filter(tiddlerObject => tiddlerObject !== undefined) as TiddlerObject[];
  }
}
