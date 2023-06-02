import type { TiddlerChangeListener, TiddlerCollection, TiddlerStore } from "@tiddlybase/shared/src/tiddler-store";
import type { Firestore } from '@firebase/firestore';
import { setDoc, doc, DocumentReference, DocumentData, collection, onSnapshot, Unsubscribe, getDoc, deleteDoc, Timestamp, serverTimestamp } from "firebase/firestore";
import type { } from '@tiddlybase/tw5-types/src/index'
import { getFirestoreCollectionPath } from "./tiddler-store-utils";
import type { FirestoreTiddlerStoreOptions } from "@tiddlybase/shared/src/tiddlybase-config-schema";

const SENTINEL_DOC_ID = "\uffffsentinel"

const maybeTrimPrefix = (title: string, options: FirestoreTiddlerStoreOptions | undefined): string => {
  if (options?.stripDocIDPrefix && title.startsWith(options.stripDocIDPrefix)) {
    return title.substring(options.stripDocIDPrefix.length);
  }
  return title;
}

const convertTimestamps = (tiddler: $tw.TiddlerFields): $tw.TiddlerFields => {
  // TODO: this is a hack, we should walk the entire object to find any date types in need of conversion
  if (tiddler.created instanceof Timestamp) {
    tiddler.created = (tiddler.created as Timestamp).toDate();
  }
  if (tiddler.modified instanceof Timestamp) {
    tiddler.modified = (tiddler.modified as Timestamp).toDate();
  }
  return tiddler
}

const writeTiddler = async (firestore: Firestore, path: string, tiddler: $tw.TiddlerFields, docId: string): Promise<DocumentReference<DocumentData>> => {
  const docRef = doc(firestore, path, docId);
  await setDoc(docRef, {
    tiddler: {
      ...tiddler,
      created: tiddler.created || serverTimestamp(),
      modified: serverTimestamp(),
    }
  });
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

type InitialReadState = {
  tiddlers: TiddlerCollection;
  completePromise: Promise<TiddlerCollection>;
  completePromiseResolver: undefined | ((tidders: TiddlerCollection) => void);
  completePromiseResolved: boolean;
}

export class FirestoreTiddlerStore implements TiddlerStore {

  firestore: Firestore;
  tiddlybaseInstanceName: string;
  tiddlerCollectionName: string;
  options: FirestoreTiddlerStoreOptions | undefined;
  changeListener: TiddlerChangeListener | undefined;
  initialReadState: InitialReadState;
  unsubscribe: Unsubscribe | undefined;

  private getInitialReadState(): InitialReadState {
    let completePromiseResolver = undefined;
    const completePromise = new Promise<TiddlerCollection>((resolve, _reject) => {
      completePromiseResolver = resolve;
    });
    return {
      tiddlers: {},
      completePromise,
      completePromiseResolver,
      completePromiseResolved: false
    };
  }

  constructor(
    firestore: Firestore,
    tiddlybaseInstanceName: string,
    tiddlerCollectionName: string,
    options?: FirestoreTiddlerStoreOptions,
    changeListener?: TiddlerChangeListener) {
    this.firestore = firestore;
    this.tiddlybaseInstanceName = tiddlybaseInstanceName;
    this.tiddlerCollectionName = tiddlerCollectionName;
    this.options = options;
    this.changeListener = changeListener;
    this.initialReadState = this.getInitialReadState();
  }

  async startListening() {
    await createCollectionSentinel(this.firestore, this.tiddlybaseInstanceName, this.tiddlerCollectionName);
    this.unsubscribe = onSnapshot(collection(this.firestore, getFirestoreCollectionPath(this.tiddlybaseInstanceName, this.tiddlerCollectionName)), (snapshot) => {
      // from: https://firebase.google.com/docs/firestore/query-data/listen#view_changes_between_snapshots
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          if (this.initialReadState.completePromiseResolved) {
            // if the initial read of firestore documents in the collection is complete,
            // only pass on the change event to the listener (when provided)
            if (this.changeListener && change.doc.data().tiddler.modified) {
              // firestore triggers the update twice: once when it's updated locally
              // (then server side timestamp is null), and once more when the write
              // goes through. We can safely ignore the first one.
              // see: https://stackoverflow.com/questions/63123697/while-updating-firestore-data-timestamp-is-null
              this.changeListener.onSetTiddler(convertTimestamps(change.doc.data().tiddler));
            }
          } else {
            // The first time the sentinel doc is encountered signals the end of the tiddler documents in the collection.
            if (change.doc.id === SENTINEL_DOC_ID) {
              if (this.initialReadState.completePromiseResolver) {
                this.initialReadState.completePromiseResolver(this.initialReadState.tiddlers);
              }
              this.initialReadState.completePromiseResolved = true;
            } else {
              // The document being read is not the last one (not the sentinel), so just store it for now.
              const tiddler = convertTimestamps(change.doc.data().tiddler);
              this.initialReadState.tiddlers[tiddler.title] = tiddler;
            }
          }
        }
        if (change.type === "removed") {
          this.changeListener?.onDeleteTiddler(change.doc.data().tiddler.title);
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

  private getDocId(title: string): string {
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
  async getAllTiddlers(): Promise<TiddlerCollection> {
    // TODO: invoking this after writes have been issues fails to reflect
    // those changes.
    return this.initialReadState.completePromise;
  }
}
