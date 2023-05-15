import type { TiddlerStore } from "@tiddlybase/shared/src/tiddler-store";
import { Firestore } from '@firebase/firestore';
import { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import type { APIClient } from "@tiddlybase/rpc/src";
import { setDoc, doc, DocumentReference, DocumentData, collection, onSnapshot, Unsubscribe, getDoc, deleteDoc } from "firebase/firestore";
import type { } from '@tiddlybase/tw5-types/src/index'

const SEPARATOR = "/"

const SENTINEL_DOC_ID = "\uffffsentinel"

const getFirestoreCollectionPath = (tiddlybaseInstanceName: string, tiddlerCollectionName: string) => {
  ///wikis/family/collections/shared/tiddlers/ExampleTiddler
  return [
    "tiddlybase-instances",
    tiddlybaseInstanceName,
    "collections",
    tiddlerCollectionName,
    "tiddlers",
  ].map(s => encodeURIComponent(s)).join(SEPARATOR);
}

const writeTiddler = async (firestore: Firestore, path: string, tiddler: $tw.TiddlerFields): Promise<DocumentReference<DocumentData>> => {
  const docRef = doc(firestore, path, encodeURIComponent(tiddler.title));
  await setDoc(docRef, { tiddler });
  console.log("Document written with ID: ", docRef.id);
  return docRef;
}

const createCollectionSentinel = async (firestore: Firestore, tiddlybaseInstanceName: string, tiddlerCollectionName: string): Promise<DocumentReference<DocumentData>> => {
  const path = getFirestoreCollectionPath(tiddlybaseInstanceName, tiddlerCollectionName);
  const docRef = doc(firestore, path, SENTINEL_DOC_ID);
  // No transaction, so possible but unlikely race condition, but that doesn't really matter too much
  if (!(await getDoc(docRef)).exists()) {
    await setDoc(docRef, {});
    console.log("Document written with ID: ", docRef.id);
  }
  return docRef;
};

export class FirestoreTiddlerStore implements TiddlerStore {

  firestore: Firestore;
  sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>;
  tiddlybaseInstanceName: string;
  tiddlerCollectionName: string;
  initialReadTiddlers: Record<string, $tw.TiddlerFields> = {};
  initialReadCompletePromise: Promise<typeof this.initialReadTiddlers>;
  initialReadCompletePromiseResolver: undefined | ((tidders: typeof this.initialReadTiddlers) => void) = undefined;
  initialReadCompletePromiseResolved: boolean = false;
  unsubscribe: Unsubscribe | undefined;

  constructor(firestore: Firestore, sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>, tiddlybaseInstanceName: string, tiddlerCollectionName: string) {
    this.firestore = firestore;
    this.sandboxedAPIClient = sandboxedAPIClient;
    this.tiddlybaseInstanceName = tiddlybaseInstanceName;
    this.tiddlerCollectionName = tiddlerCollectionName;
    this.initialReadCompletePromise = new Promise((resolve, _reject) => {
      this.initialReadCompletePromiseResolver = resolve;
    })
  }

  async startListening() {
    await createCollectionSentinel(this.firestore, this.tiddlybaseInstanceName, this.tiddlerCollectionName);
    this.unsubscribe = onSnapshot(collection(this.firestore, getFirestoreCollectionPath(this.tiddlybaseInstanceName, this.tiddlerCollectionName)), (snapshot) => {
      // from: https://firebase.google.com/docs/firestore/query-data/listen#view_changes_between_snapshots
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          // The first time the sentinel doc is encountered signals the end of the tiddler documents in the collection.
          // Theoretically, the sentinel doc could be updated for some reason, but that doesn't impact initialReadTiddlers.
          if (!this.initialReadCompletePromiseResolved && change.doc.id === SENTINEL_DOC_ID) {
            this.initialReadCompletePromiseResolved = true;
            if (this.initialReadCompletePromiseResolver) {
              this.initialReadCompletePromiseResolver(this.initialReadTiddlers)
            }
          } else {
            this.initialReadTiddlers[change.doc.data().tiddler.title] = change.doc.data().tiddler;
          }
          // TODO: forward setTiddler to tiddlywiki in child iframe:
          // this.sandboxedAPIClient('onSetTiddler', [change.doc.data().tiddler]);
        }
        if (change.type === "removed") {
          // TODO: forward deleteTiddler to tiddlywiki in child iframe:
          // this.sandboxedAPIClient('onDeleteTiddler', [change.doc.data().tiddler.title]);
          console.log("Removed: ", change.doc.data());
        }
      });
    });
  }

  async stopListening() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
    // TODO: reset initialTiddler state?
  }

  async getTiddler(title: string): Promise<$tw.TiddlerFields | undefined> {
    // TODO
    console.log('getTiddler', title);
    return undefined;
  }
  async setTiddler(tiddler: $tw.TiddlerFields): Promise<$tw.TiddlerFields> {
    const result = writeTiddler(this.firestore, getFirestoreCollectionPath(this.tiddlybaseInstanceName, this.tiddlerCollectionName), tiddler);
    console.log('setTiddler (outer)', tiddler, result);
    return tiddler;
  }
  async deleteTiddler(title: string): Promise<void> {
    console.log('deleteTiddler (outer)', title);
    const docRef = doc(this.firestore, getFirestoreCollectionPath(this.tiddlybaseInstanceName, this.tiddlerCollectionName), encodeURIComponent(title));
    return await deleteDoc(docRef);
  }
  async getAllTiddlers(): Promise<Record<string, $tw.TiddlerFields>> {
    // TODO: invoking this after writes have been issues fails to reflect
    // those changes.
    return this.initialReadCompletePromise;
  }
}
