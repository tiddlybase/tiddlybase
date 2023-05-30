import type { } from '@tiddlybase/tw5-types/src/index'
import type { TiddlerCollection, TiddlerStore } from "@tiddlybase/shared/src/tiddler-store";

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

  // TODO: add constructor with optional URL prefix parameter

  async getTiddler (title: string): Promise<$tw.TiddlerFields | undefined> {
    // TODO
    throw new Error("Not implemented!");
  }

  async setTiddler (tiddler: $tw.TiddlerFields): Promise<$tw.TiddlerFields> {
    const url = `recipes/default/tiddlers/${encodeURIComponent(tiddler.title)}`
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
    const url = `bags/default/tiddlers/${encodeURIComponent(title)}`
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
    // TODO: load from http://localhost:8080/recipes/default/tiddlers.json?exclude=, maybe?
    // trailing comma is weird but correct...
    return {};
  }
}
