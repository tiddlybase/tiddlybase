import type { TiddlerCollection } from "@tiddlybase/shared/src/tiddler-store";

const FIRESTORE_SEPARATOR = "/"

export const getFirestoreCollectionPath = (tiddlybaseInstanceName: string, tiddlerCollectionName: string) => {
  return [
    "tiddlybase-instances",
    tiddlybaseInstanceName,
    "collections",
    tiddlerCollectionName,
    "tiddlers",
  ].map(s => encodeURIComponent(s)).join(FIRESTORE_SEPARATOR);
}

export const mergeTiddlerArray = (tiddlers: $tw.TiddlerFields[]): TiddlerCollection => tiddlers.reduce((coll, tiddler) => {
  coll[tiddler.title] = tiddler;
  return coll;
}, {} as TiddlerCollection);

export const fetchJSON = async (url:string):Promise<any> => await (await (fetch(url))).json();
