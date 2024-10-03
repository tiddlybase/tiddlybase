import type { } from '@tiddlybase/tw5-types/src/index'
import type {TiddlerCollection } from "@tiddlybase/shared/src/tiddler-storage";
import { FileStorageTiddlerStorage } from './file-storage-tiddler-storage';
import { HttpFileStorage } from '../file-storage/http-file-source';
import { LaunchParameters, TiddlerStorageWriteCondition } from '@tiddlybase/shared/src/tiddlybase-config-schema';
import { TiddlerStorageBase } from './tiddler-storage-base';

const DEFAULT_FILTER_EXPRESSION = "[is[tiddler]]";

const DEFAULT_URL_PREFIX = "/";

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

export class TiddlyWebTiddlerStorage extends TiddlerStorageBase {
  urlPrefix: string;
  filterExpression: string;

  constructor(
    launchParamters: LaunchParameters,
    writeCondition: TiddlerStorageWriteCondition|undefined,
    {urlPrefix, filterExpression}:{urlPrefix?:string, filterExpression?:string}={}) {
    super(launchParamters, writeCondition);
    this.urlPrefix = urlPrefix ?? DEFAULT_URL_PREFIX;
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
    await fetch(url, {
      method: 'PUT',
      headers: {
        "Content-type": "application/json",
        "X-Requested-With": "TiddlyWiki"
      },
      body: convertTiddlerToTiddlyWebFormat(tiddler)
    });
    return Promise.resolve(tiddler);
  }

  async deleteTiddler (title: string): Promise<void> {
    const url = this.makeURL(`bags/default/tiddlers/${encodeURIComponent(title)}`);
    await fetch(url, {
      method: 'DELETE',
      headers: {
        "X-Requested-With": "TiddlyWiki"
      },
    });
    return
  }

  async getAllTiddlers (): Promise<TiddlerCollection> {
    // exclude=, prevents 'text' field from being omitted
    let urlSuffix = `recipes/default/tiddlers.json?exclude=,&filter=${encodeURIComponent(this.filterExpression)}`;
    return new FileStorageTiddlerStorage(
      new HttpFileStorage(this.makeURL(urlSuffix)),
      '').getAllTiddlers();
  }
}
