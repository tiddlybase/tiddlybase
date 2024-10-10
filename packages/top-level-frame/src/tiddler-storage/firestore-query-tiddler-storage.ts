
import type { TiddlerCollection, TiddlerStorageChangeListener } from "@tiddlybase/shared/src/tiddler-storage";
import { FireStoreQuery, FirestoreWhereClause, LaunchParameters, FirestoreQueryTiddlerStorageOptions, TiddlerStorageWriteCondition, PinTiddlerToStorageCondition } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { collection, collectionGroup, onSnapshot, query, where, Query, FieldPath, Unsubscribe, setDoc, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import type { Firestore } from '@firebase/firestore';
import { asList } from "@tiddlybase/shared/src/obj-utils";
import { convertTimestamps } from "./firestore-tiddler-storage"
import { normalizeFirebaseError } from "../firebase-utils";
import { evaluateMustacheTemplate, getFirestoreCollectionPath, uriEncodeLaunchParameters } from "./tiddler-storage-utils";
import { TiddlerStorageBase } from "./tiddler-storage-base";

export class FirestoreQueryTiddlerStorage extends TiddlerStorageBase {
  /**
   * Read-Only tiddler storage for getting tiddlers using a FireStore query.
   * To make the result set dynamic, getAllTiddlers() returns an empty collection
   * and only the changeListener is called when the result snapshot is updated.
   */

  unsubscribe: Unsubscribe | undefined;
  pathPrefix: string | undefined;
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
  titleToFullDocPath: Record<string, string> = {};

  constructor(
    launchParameters: LaunchParameters,
    writeCondition: TiddlerStorageWriteCondition | undefined,
    pinCondition: PinTiddlerToStorageCondition | undefined,
    private clientId: number,
    private firestore: Firestore,
    private query: FireStoreQuery,
    private changeListener: TiddlerStorageChangeListener,
    private options: FirestoreQueryTiddlerStorageOptions | undefined = undefined
  ) {
    super(launchParameters, writeCondition, pinCondition);
    this.pathPrefix = this.options?.pathPrefixTemplate ? getFirestoreCollectionPath(
      this.launchParameters,
      undefined,
      this.options.pathPrefixTemplate
    ) : undefined
  }

  async getTiddler(title: string): Promise<$tw.TiddlerFields | undefined> {
    return this.tiddlerCollection[title];
  }
  canAcceptTiddler(tiddler: $tw.TiddlerFields): boolean {
    return (tiddler.title in this.titleToFullDocPath) && this.writeConditionEvaluator(tiddler, this.launchParameters);
  }
  async setTiddler(tiddler: $tw.TiddlerFields): Promise<$tw.TiddlerFields> {
    const fullPath = this.titleToFullDocPath[tiddler.title];
    if (fullPath === undefined) {
      console.log(`FirestoreQueryTiddlerStorage cannot write tiddler ${tiddler.title} as it is not in resultset.`);
      return tiddler;
    }
    const docRef = doc(this.firestore, fullPath);
    await setDoc(docRef, {
      tiddler: {
        ...tiddler,
        created: tiddler.created || serverTimestamp(),
        creator: tiddler.creator || this.launchParameters.userId,
        modifier: this.launchParameters.userId,
        modified: serverTimestamp(),
      },
      clientId: this.clientId
    });
    return tiddler;
  }
  async deleteTiddler(title: string): Promise<void> {
    const fullPath = this.titleToFullDocPath[title];
    if (fullPath === undefined) {
      console.log(`FirestoreQueryTiddlerStorage cannot delete tiddler ${title} as it is not in resultset.`);
    }
    const docRef = doc(this.firestore, fullPath);
    return await deleteDoc(docRef);
  }

  private constructQueryValue(value: any): any {
    if (typeof (value) === 'string') {
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

  pathCheck(docPath: string): boolean {
    return this.pathPrefix ? docPath.startsWith(this.pathPrefix) : true;
  }

  async startListening() {
    try {
      this.unsubscribe = onSnapshot(
        this.constructQuery(),
        (snapshot) => {
          // from: https://firebase.google.com/docs/firestore/query-data/listen#view_changes_between_snapshots
          snapshot.docChanges().forEach((change) => {
            if (this.pathCheck(change.doc.ref.path)) {
              if (change.type === "added" || change.type === "modified") {
                if (!change.doc.metadata.hasPendingWrites) {
                  // firestore triggers the update twice: once when it's updated locally
                  // and once more when the write goes through. We can safely ignore the first one.
                  // see: https://stackoverflow.com/questions/63123697/while-updating-firestore-data-timestamp-is-null
                  const data = change.doc.data();
                  // We don't want to trigger tiddler updates from our own writes
                  if (data.clientId !== this.clientId) {
                    const tiddler = convertTimestamps(change.doc.data().tiddler);
                    // For collection groups, there could be several documents with the same title.
                    // only add the first one.
                    if ((tiddler.title in this.titleToFullDocPath) && (this.titleToFullDocPath[tiddler.title] !== change.doc.ref.path)) {
                      return;
                    }
                    this.tiddlerCollection[tiddler.title] = tiddler;
                    this.titleToFullDocPath[tiddler.title] = change.doc.ref.path;
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
          throw normalizeFirebaseError(error, this.launchParameters.instance, JSON.stringify(this.query), 'firestore-query', 'onSnapshot');
        }
      );
    } catch (e: any) {
      throw normalizeFirebaseError(e, this.launchParameters.instance, JSON.stringify(this.query), 'firestore-query', 'onSnapshot');
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
