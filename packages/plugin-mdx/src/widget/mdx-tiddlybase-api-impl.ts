import { TW5ReactContext } from "@tiddlybase/plugin-react/src/components/TW5ReactContext";
import { useContext } from "react";
import { MDXTiddlybaseAPI, TiddlerObject } from "./mdx-tiddlybase-api";

const createMergedTiddler = (wiki: $tw.Wiki, previousVersion: $tw.TiddlerFields | undefined, currentVersion: $tw.TiddlerFields, update: boolean): $tw.TiddlerFields => {
  const mergedTiddler = {
    ...((previousVersion && update) ? previousVersion : {}),
    ...currentVersion
  };
  // set created field
  if (!('created' in mergedTiddler)) {
    if (previousVersion?.created) {
      mergedTiddler.created = previousVersion.created
    } else {
      Object.assign(mergedTiddler, wiki.getCreationFields())
    }
  }
  // set modified field
  Object.assign(mergedTiddler, wiki.getModificationFields())
  wiki.addTiddler(mergedTiddler);
  return mergedTiddler;
}

export class MDXTiddlybaseAPIImpl implements MDXTiddlybaseAPI {
  wiki: $tw.Wiki;
  constructor(wiki:$tw.Wiki) {
    this.wiki = wiki;
  }
  setTiddler (tiddler: $tw.TiddlerFields): $tw.TiddlerFields {
    const previousVersion = this.getTiddler(tiddler.title);
    return createMergedTiddler(this.wiki, previousVersion, tiddler, false);
  }
  updateTiddler (tiddler: $tw.TiddlerFields): $tw.TiddlerFields {
    const previousVersion = this.getTiddler(tiddler.title);
    return createMergedTiddler(this.wiki, previousVersion, tiddler, true);
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
