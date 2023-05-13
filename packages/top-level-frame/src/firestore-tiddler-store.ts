import type { TiddlerStore } from "@tiddlybase/shared/src/tiddler-store";
import { Firestore } from '@firebase/firestore';
import { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import type { APIClient } from "@tiddlybase/rpc/src";
import { setDoc, doc, DocumentReference, DocumentData } from "firebase/firestore";
import type { } from '@tiddlybase/tw5-types/src/index'

const SEPARATOR = "/"

const getFirestoreCollectionPath = (wikiName:string, collection:string) => {
  ///wikis/family/collections/shared/tiddlers/ExampleTiddler
  return [
    "wikis",
    wikiName,
    "collections",
    collection,
    "tiddlers",
  ].map(s => encodeURIComponent(s)).join(SEPARATOR);
}

const writeTiddler = async (firestore:Firestore, path: string, tiddler:$tw.TiddlerFields):Promise<DocumentReference<DocumentData>> => {
    const docRef = doc(firestore, path, encodeURIComponent(tiddler.title));
    await setDoc(docRef, tiddler);
    console.log("Document written with ID: ", docRef.id);
    return docRef;
}

export class FirestoreTiddlerStore implements TiddlerStore {

  firestore: Firestore;
  sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>;
  wikiName: string;
  tiddlybaseInstanceName: string;

  constructor(firestore: Firestore, sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>, tiddlybaseInstanceName:string, wikiName: string) {
    this.firestore = firestore;
    this.sandboxedAPIClient = sandboxedAPIClient;
    this.tiddlybaseInstanceName = tiddlybaseInstanceName;
    this.wikiName = wikiName
  }

  // Proxy incoming onAddTiddler and onRemoveTiddler
  /*
  onSetTiddler (tiddler: $tw.TiddlerFields) {
    this.sandboxedAPIClient('onSetTiddler', [tiddler]);
  }
  onDeleteTiddler (title: string) {
    this.sandboxedAPIClient('onDeleteTiddler', [title]);
  }
  */
  async getTiddler (title: string): Promise<$tw.TiddlerFields | undefined> {
    // TODO
    console.log('getTiddler', title);
    return undefined;
  }
  async setTiddler (tiddler: $tw.TiddlerFields): Promise<$tw.TiddlerFields> {
    // TODO bag
    const bag = "shared";
    const result = writeTiddler(this.firestore, getFirestoreCollectionPath(this.wikiName, bag), tiddler);
    console.log('setTiddler (outer)', tiddler, result);
    return tiddler;
  }
  async deleteTiddler (title: string) : Promise<boolean> {
    // TODO
    console.log('deleteTiddler (outer)', title);
    return false;
  }
}
