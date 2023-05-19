import type { TiddlerStore } from "@tiddlybase/shared/src/tiddler-store";
import type { Firestore } from '@firebase/firestore';
import type { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import type { APIClient } from "@tiddlybase/rpc/src";
import { setDoc, doc, DocumentReference, DocumentData, collection, onSnapshot, Unsubscribe, getDoc, deleteDoc, Timestamp } from "firebase/firestore";
import type { } from '@tiddlybase/tw5-types/src/index'
import { getFirestoreCollectionPath } from "./firestore-tiddler-store-util";
import type { FirestoreTiddlerStoreOptions } from "@tiddlybase/shared/src/tiddlybase-config-schema";

const SENTINEL_DOC_ID = "\uffffsentinel"

const maybeTrimPrefix = (title: string, options: FirestoreTiddlerStoreOptions | undefined): string => {
  if (options?.stripDocIDPrefix && title.startsWith(options.stripDocIDPrefix)) {
    return title.substring(options.stripDocIDPrefix.length);
  }
  return title;
}

const writeTiddler = async (firestore: Firestore, path: string, tiddler: $tw.TiddlerFields, docId: string): Promise<DocumentReference<DocumentData>> => {
  const docRef = doc(firestore, path, docId);
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
  options: FirestoreTiddlerStoreOptions | undefined;

  constructor(
    firestore: Firestore,
    sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>,
    tiddlybaseInstanceName: string,
    tiddlerCollectionName: string,
    options?: FirestoreTiddlerStoreOptions) {
    this.firestore = firestore;
    this.sandboxedAPIClient = sandboxedAPIClient;
    this.tiddlybaseInstanceName = tiddlybaseInstanceName;
    this.tiddlerCollectionName = tiddlerCollectionName;
    this.options = options;
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
            const tiddler = change.doc.data().tiddler;
            // TODO: this is a hack, we should walk the entire object to find any date types in need of conversion
            if (tiddler.created instanceof Timestamp) {
              tiddler.created = (tiddler.created as Timestamp).toDate()
            }
            if (tiddler.modified instanceof Timestamp) {
              tiddler.modified = (tiddler.modified as Timestamp).toDate()
            }
            this.initialReadTiddlers[tiddler.title] = tiddler;
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

  private getDocId(title:string):string {
    return encodeURIComponent(maybeTrimPrefix(title, this.options));
  }

  async getTiddler(title: string): Promise<$tw.TiddlerFields | undefined> {
    // TODO
    console.log('getTiddler', title);
    return undefined;
  }
  async setTiddler(tiddler: $tw.TiddlerFields): Promise<$tw.TiddlerFields> {
    const docId = this.getDocId(tiddler.title);
    const result = writeTiddler(this.firestore, getFirestoreCollectionPath(this.tiddlybaseInstanceName, this.tiddlerCollectionName), tiddler, docId);
    console.log('setTiddler (outer)', tiddler, result);
    return tiddler;
  }
  async deleteTiddler(title: string): Promise<void> {
    console.log('deleteTiddler (outer)', title);
    const docRef = doc(this.firestore, getFirestoreCollectionPath(this.tiddlybaseInstanceName, this.tiddlerCollectionName), this.getDocId(title));
    return await deleteDoc(docRef);
  }
  async getAllTiddlers(): Promise<Record<string, $tw.TiddlerFields>> {
    // TODO: invoking this after writes have been issues fails to reflect
    // those changes.
    return this.initialReadCompletePromise;
  }
}
