import type { } from '@tiddlybase/tw5-types/src/index'
import type { TiddlerCollection, WritableTiddlerDataSource } from "@tiddlybase/shared/src/tiddler-data-source";
import { FileDataSourceTiddlerSource } from './file-storage-tiddler-source';
import { HttpFileDataSource } from '../file-data-sources/http-file-source';

const DEFAULT_FILTER_EXPRESSION = "[is[tiddler]]";

const dateFields = new Set<string>(["created", "modified"]);

const knownFields = new Set<string>([
  "bag", "creator",  "modifier", "permissions", "recipe", "revision", "tags", "text", "title", "type", "uri"
]);

// based on TW5 source
const pad = (value:number,length:number=2):string => {
	var s = value.toString();
	if(s.length < length) {
		s = "000000000000000000000000000".substr(0,length - s.length) + s;
	}
	return s;
}

const formatDate = (value:Date):string => {
    return value.getUTCFullYear() +
        pad(value.getUTCMonth() + 1) +
        pad(value.getUTCDate()) +
        pad(value.getUTCHours()) +
        pad(value.getUTCMinutes()) +
        pad(value.getUTCSeconds()) +
        pad(value.getUTCMilliseconds(),3);
}

const convertTiddlerToTiddlyWebFormat = (tiddler:$tw.TiddlerFields):string => {
  const result: Record<string, any> & {fields: Record<string, any>} = {fields: {}};
  for (let [fieldName, fieldValue] of Object.entries(tiddler)) {
    if (dateFields.has(fieldName)) {
      result[fieldName] = formatDate(fieldValue);
    }
    else if (knownFields.has(fieldName)) {
      result[fieldName] = fieldValue;
    } else {
      result.fields[fieldName] = fieldValue
    }
  }
  // Default the content type
  result.type = result.type || "text/vnd.tiddlywiki";
  return JSON.stringify(result,null,4);
};

export class TiddlyWebTiddlerStore implements WritableTiddlerDataSource {
  urlPrefix: string;
  filterExpression: string;

  constructor({urlPrefix, filterExpression}:{urlPrefix?:string, filterExpression?:string}={}) {
    this.urlPrefix = urlPrefix ?? '';
    this.filterExpression = filterExpression ?? DEFAULT_FILTER_EXPRESSION;
  }

  async getTiddler (title: string): Promise<$tw.TiddlerFields | undefined> {
    // TODO
    throw new Error("Not implemented!");
  }

  private makeURL(suffix:string):string {
    return (this.urlPrefix) + suffix;
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
    let urlSuffix = `recipes/default/tiddlers.json?exclude=,&filter=${encodeURIComponent(this.filterExpression)}`;
    return new FileDataSourceTiddlerSource(
      new HttpFileDataSource(this.makeURL(urlSuffix)),
      '').getAllTiddlers();
  }
}
