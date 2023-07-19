import type { TiddlerCollection } from "@tiddlybase/shared/src/tiddler-data-source";

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

export const mergeTiddlerArray = (tiddlers: $tw.TiddlerFields | $tw.TiddlerFields[]): TiddlerCollection => {
  if (Array.isArray(tiddlers)) {
    return tiddlers.reduce((coll, tiddler) => {
      coll[tiddler.title] = tiddler;
      return coll;
    }, {} as TiddlerCollection);
  }
  return { [tiddlers.title]: tiddlers };
};

export const fetchJSON = async (url: string): Promise<any> => await (await (fetch(url))).json();
