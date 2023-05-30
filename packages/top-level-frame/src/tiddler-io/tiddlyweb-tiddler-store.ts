import type { } from '@tiddlybase/tw5-types/src/index'
import type { TiddlerCollection, TiddlerStore } from "@tiddlybase/shared/src/tiddler-store";
import { HttpTiddlerSource } from './http-tiddler-source';

const knownFields = new Set<string>([
  "bag", "created", "creator", "modified", "modifier", "permissions", "recipe", "revision", "tags", "text", "title", "type", "uri"
]);

// based on TW5 source
const convertTiddlerToTiddlyWebFormat = (tiddler:$tw.TiddlerFields):string => {
  const result: Record<string, any> & {fields: Record<string, any>} = {fields: {}};
  for (let [fieldName, fieldValue] of Object.entries(tiddler)) {
    if (knownFields.has(fieldName)) {
      result[fieldName] = fieldValue;
    } else {
      result.fields[fieldName] = fieldValue
    }
  }
  // Default the content type
  result.type = result.type || "text/vnd.tiddlywiki";
  return JSON.stringify(result,null,4);
};

export class TiddlyWebTiddlerStore implements TiddlerStore {
  urlPrefix: string | undefined;
  filterExpression: string | undefined;

  constructor({urlPrefix, filterExpression}:{urlPrefix?:string, filterExpression?:string}) {
    this.urlPrefix = urlPrefix;
    this.filterExpression = filterExpression;
  }

  async getTiddler (title: string): Promise<$tw.TiddlerFields | undefined> {
    // TODO
    throw new Error("Not implemented!");
  }

  private makeURL(suffix:string):string {
    return (this.urlPrefix  || '') + suffix;
  }

  async setTiddler (tiddler: $tw.TiddlerFields): Promise<$tw.TiddlerFields> {
    const url = this.makeURL(`recipes/default/tiddlers/${encodeURIComponent(tiddler.title)}`);
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        "Content-type": "application/json",
        "X-Requested-With": "TiddlyWiki"
      },
      body: convertTiddlerToTiddlyWebFormat(tiddler)
    });
    console.log("TiddlyWeb setTiddler response", response);
    return Promise.resolve(tiddler);
  }

  async deleteTiddler (title: string): Promise<void> {
    const url = this.makeURL(`bags/default/tiddlers/${encodeURIComponent(title)}`);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        "X-Requested-With": "TiddlyWiki"
      },
    });
    console.log("TiddlyWeb deleteTiddler response", response);
    return
  }

  async getAllTiddlers (): Promise<TiddlerCollection> {
    // exclude=, prevents 'text' field from being omitted
    let urlSuffix = 'recipes/default/tiddlers.json?exclude=,'
    if (this.filterExpression) {
      urlSuffix += `&filter=${encodeURIComponent(this.filterExpression)}`;
    }
    return new HttpTiddlerSource(this.makeURL(urlSuffix)).getAllTiddlers();
  }
}
