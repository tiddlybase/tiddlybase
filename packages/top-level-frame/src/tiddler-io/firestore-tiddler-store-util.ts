const SEPARATOR = "/"

export const getFirestoreCollectionPath = (tiddlybaseInstanceName: string, tiddlerCollectionName: string) => {
  return [
    "tiddlybase-instances",
    tiddlybaseInstanceName,
    "collections",
    tiddlerCollectionName,
    "tiddlers",
  ].map(s => encodeURIComponent(s)).join(SEPARATOR);
}
