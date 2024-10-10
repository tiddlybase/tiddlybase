import { type TiddlerStorageChangeListener, type TiddlerCollection } from "@tiddlybase/shared/src/tiddler-storage";
import type { Firestore } from '@firebase/firestore';
import { setDoc, doc, DocumentReference, DocumentData, collection, onSnapshot, Unsubscribe, getDoc, deleteDoc, Timestamp, serverTimestamp } from "firebase/firestore";
import type { } from '@tiddlybase/tw5-types/src/index'
import { getFirestoreCollectionPath, DEFAULT_FIRESTORE_PATH_TEMPLATE, evaluateMustacheTemplate } from "./tiddler-storage-utils";
import type { FirestoreTiddlerStorageOptions, LaunchParameters, PinTiddlerToStorageCondition, TiddlerStorageWriteCondition } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { normalizeFirebaseError } from "../firebase-utils";
import { TiddlerStorageBase } from "./tiddler-storage-base";

const SENTINEL_DOC_ID = "\uffffsentinel"

const maybeTrimPrefix = (title: string, options: FirestoreTiddlerStorageOptions | undefined): string => {
  if (options?.stripDocIDPrefix && title.startsWith(options.stripDocIDPrefix)) {
    return title.substring(options.stripDocIDPrefix.length);
  }
  return title;
}

export const convertTimestamps = (tiddler: $tw.TiddlerFields): $tw.TiddlerFields => {
  // TODO: this is a hack, we should walk the entire object to find any date types in need of conversion
  if (tiddler.created instanceof Timestamp) {
    tiddler.created = (tiddler.created as Timestamp).toDate();
  }
  if (tiddler.modified instanceof Timestamp) {
    tiddler.modified = (tiddler.modified as Timestamp).toDate();
  }
  return tiddler
}

type InitialReadState = {
  tiddlers: TiddlerCollection;
  completePromise: Promise<TiddlerCollection>;
  completePromiseResolver: undefined | ((tidders: TiddlerCollection) => void);
  completePromiseResolved: boolean;
}

export class FirestoreTiddlerStorage extends TiddlerStorageBase {

  collectionPath: string;
  initialReadState: InitialReadState;
  unsubscribe: Unsubscribe | undefined;

  private async createCollectionSentinel(creator: string): Promise<DocumentReference<DocumentData>> {
    const docRef = doc(this.firestore, this.collectionPath, SENTINEL_DOC_ID);
    // No transaction, so possible but unlikely race condition, but that doesn't really matter too much,
    // because the worst case scenario is that multiple writers write the same empty sentinel doc
    if (!(await getDoc(docRef)).exists()) {
      await setDoc(
        docRef,
        // setting creator tiddler field required by firestore rules
        {
          tiddler: {creator}
        }
      );
    }
    return docRef;
  };


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
    launchParameters: LaunchParameters,
    writeCondition: TiddlerStorageWriteCondition|undefined,
    pinCondition: PinTiddlerToStorageCondition|undefined,
    private clientId: number,
    private firestore: Firestore,
    collection?: string,
    pathTemplate?: string,
    private options?: FirestoreTiddlerStorageOptions,
    private changeListener?: TiddlerStorageChangeListener,
  ) {
    super(launchParameters, writeCondition, pinCondition);
    this.collectionPath = getFirestoreCollectionPath(
      launchParameters,
      evaluateMustacheTemplate(collection ?? "", launchParameters),
      pathTemplate ?? DEFAULT_FIRESTORE_PATH_TEMPLATE)
    this.initialReadState = this.getInitialReadState();
  }

  async startListening() {
    try {
      await this.createCollectionSentinel(this.launchParameters.userId!);
    } catch (e: any) {
      throw normalizeFirebaseError(e, this.launchParameters.instance, this.collectionPath, 'firestore', 'createCollectionSentinel');
    }
    try {
      this.unsubscribe = onSnapshot(collection(this.firestore, this.collectionPath), (snapshot) => {
        // from: https://firebase.google.com/docs/firestore/query-data/listen#view_changes_between_snapshots
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" || change.type === "modified") {
            if (this.initialReadState.completePromiseResolved) {
              // if the initial read of firestore documents in the collection is complete,
              // only pass on the change event to the listener (when provided)
              if (this.changeListener && !change.doc.metadata.hasPendingWrites) {
                // firestore triggers the update twice: once when it's updated locally
                // and once more when the write goes through. We can safely ignore the first one.
                // see: https://stackoverflow.com/questions/63123697/while-updating-firestore-data-timestamp-is-null
                const data = change.doc.data();
                // We don't want to trigger tiddler updates from our own writes
                if (data.clientId !== this.clientId) {
                  this.changeListener.onSetTiddler(convertTimestamps(change.doc.data().tiddler));
                }
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
    } catch (e: any) {
      throw normalizeFirebaseError(e, this.launchParameters.instance, this.collectionPath, 'firestore', 'onSnapshot');
    }
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
    return undefined;
  }
  async setTiddler(tiddler: $tw.TiddlerFields): Promise<$tw.TiddlerFields> {
    const docRef = doc(this.firestore, this.collectionPath, this.getDocId(tiddler.title));
    const updatedTiddler:$tw.TiddlerFields = {
      ...tiddler,
      creator: tiddler.creator || this.launchParameters.userId,
      modifier: this.launchParameters.userId,
    };
    try {
      await setDoc(docRef, {
        tiddler: {
          ...updatedTiddler,
          created: tiddler.created || serverTimestamp(),
          modified: serverTimestamp(),
        },
        clientId: this.clientId
      });
    } catch (e) {
      console.error(`Firestore write error to ${docRef.path}`, e, updatedTiddler);
      throw normalizeFirebaseError(e, this.launchParameters.instance, this.collectionPath, 'firestore', 'setTiddler');
    }
    return updatedTiddler;
  }
  async deleteTiddler(title: string): Promise<void> {
    const docRef = doc(this.firestore, this.collectionPath, this.getDocId(title));
    try {
      return await deleteDoc(docRef);
    } catch (e) {
      console.error(`Firestore deleting ${docRef.path}`, e);
      throw normalizeFirebaseError(e, this.launchParameters.instance, this.collectionPath, 'firestore', 'deleteTiddler');
    }
  }
  async getAllTiddlers(): Promise<TiddlerCollection> {
    // TODO: invoking this after writes have been issues fails to reflect
    // those changes.
    return this.initialReadState.completePromise;
  }
}
