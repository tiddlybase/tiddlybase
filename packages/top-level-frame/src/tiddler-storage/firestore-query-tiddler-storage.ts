
import type { TiddlerCollection, ReadOnlyTiddlerStorage, TiddlerStorageChangeListener } from "@tiddlybase/shared/src/tiddler-storage";
import { FireStoreQuery, FirestoreWhereClause, LaunchParameters } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { collection, collectionGroup, onSnapshot, query, where, Query, FieldPath, Unsubscribe } from "firebase/firestore";
import type { Firestore } from '@firebase/firestore';
import { asList } from "@tiddlybase/shared/src/obj-utils";
import { convertTimestamps } from "./firestore-tiddler-storage"
import { normalizeFirebaseReadError } from "../firebase-utils";
import { DEFAULT_FIRESTORE_INSTANCE_PATH, evaluateMustacheTemplate, getFirestoreCollectionPath, uriEncodeLaunchParameters } from "./tiddler-storage-utils";

export class FirestoreQueryTiddlerStorage implements ReadOnlyTiddlerStorage {
  /**
   * Read-Only tiddler storage for getting tiddlers using a FireStore query.
   * To make the result set dynamic, getAllTiddlers() returns an empty collection
   * and only the changeListener is called when the result snapshot is updated.
   */

  unsubscribe: Unsubscribe | undefined;
  instancePathPrefix: string;
  // Note that there is a slight race condition where some tiddler returned by
  // firestore may not be passed on to the wiki. The reason is that during the
  // boot sequence:
  // 1. The child iframe is created. When it can create and RPC request to the
  //    parent, it calls childIframeReady, which initializes the tiddler sources
  //    and returns all tiddlers from getAllTiddlers(). Everything read before
  //    this point is fine, since it's written to this.tiddlerCollection which
  //    is returned by getAllTiddlers and merged with all the other collections'
  //    tiddlers.
  // 2. When the wiki boots up, it invokes tiddlywikiBootComplete, which causes
  //    the change listener to be enabled.
  // If there are tiddlers returned from firestore when 1 has completed by
  // before 2 has happened then they will be writted to tiddlerCollection but
  // never forwarded to the wiki.
  // Leaving this as-is for now, because my hunch is this won't happen in
  // practice.
  tiddlerCollection: TiddlerCollection = {};

  constructor(
    private clientId: number,
    private firestore: Firestore,
    private launchParameters: LaunchParameters,
    private query: FireStoreQuery,
    private changeListener: TiddlerStorageChangeListener) {
      this.instancePathPrefix = getFirestoreCollectionPath(
        this.launchParameters,
        undefined,
        DEFAULT_FIRESTORE_INSTANCE_PATH
      )
  }

  private constructQueryValue(value: any): any {
    if (typeof(value) === 'string') {
      return evaluateMustacheTemplate(
        value,
        uriEncodeLaunchParameters(this.launchParameters));
    }
    return value;
  }

  private constructQuery(): Query {
    const from = 'collectionGroup' in this.query.from ? collectionGroup(
      this.firestore,
      this.query.from.collectionGroup
    ) : collection(
      this.firestore,
      this.query.from.collection
    )
    const whereClauses = asList(this.query.where).map((rawClause: FirestoreWhereClause) => {
      return where(
        typeof (rawClause.path) === 'string' ? rawClause.path : new FieldPath(...rawClause.path),
        rawClause.operator,
        this.constructQueryValue(rawClause.value)
      )
    })
    return query(from, ...whereClauses);
  }

  docInCurrentInstance(docId: string): boolean {
    return docId.startsWith(this.instancePathPrefix);
  }

  async startListening() {
    try {
      this.unsubscribe = onSnapshot(
        this.constructQuery(),
        (snapshot) => {
          // from: https://firebase.google.com/docs/firestore/query-data/listen#view_changes_between_snapshots
          snapshot.docChanges().forEach((change) => {
            if (this.docInCurrentInstance(change.doc.ref.path)) {
              if (change.type === "added" || change.type === "modified") {
                if (!change.doc.metadata.hasPendingWrites) {
                  // firestore triggers the update twice: once when it's updated locally
                  // and once more when the write goes through. We can safely ignore the first one.
                  // see: https://stackoverflow.com/questions/63123697/while-updating-firestore-data-timestamp-is-null
                  const data = change.doc.data();
                  // We don't want to trigger tiddler updates from our own writes
                  if (data.clientId !== this.clientId) {
                    const tiddler = convertTimestamps(change.doc.data().tiddler);
                    this.tiddlerCollection[tiddler.title] = tiddler;
                    this.changeListener.onSetTiddler(tiddler);
                  }
                }
              }
              if (change.type === "removed") {
                delete this.tiddlerCollection[change.doc.data().tiddler.title];
                this.changeListener.onDeleteTiddler(change.doc.data().tiddler.title);
              }
            }
          });
        },
        error => {
          throw normalizeFirebaseReadError(error, this.launchParameters.instance, JSON.stringify(this.query), 'firestore-query', 'onSnapshot');
        }
      );
    } catch (e: any) {
      throw normalizeFirebaseReadError(e, this.launchParameters.instance, JSON.stringify(this.query), 'firestore-query', 'onSnapshot');
    }
  }

  async stopListening() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }


  async getAllTiddlers(): Promise<TiddlerCollection> {
    return this.tiddlerCollection;
  }
}
