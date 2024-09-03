import type { } from "@tiddlybase/tw5-types/src/index";
import * as admin from 'firebase-admin';
import { default as merge } from 'lodash.merge';

export const writeFirestoreDocument = async (
  app: admin.app.App,
  userId: string,
  docPath: string,
  tiddler: $tw.TiddlerFields,
  mergeWithExistingTiddler = false
): Promise<$tw.TiddlerFields> => {
  const firestore = app.firestore();
  let tiddlerDoc: $tw.TiddlerFields = mergeWithExistingTiddler ? ((await firestore.doc(docPath).get()).data()?.tiddler ?? {}) : {
    title: tiddler.title
  }
  merge(
    tiddlerDoc,
    tiddler
  );
  await firestore.doc(docPath).set({
    tiddler: {
      ...tiddlerDoc,
      modified: admin.firestore.FieldValue.serverTimestamp(),
      modifier: userId,
      creator: tiddlerDoc.creator ?? userId,
      created: tiddlerDoc.created ?? admin.firestore.FieldValue.serverTimestamp(),
      title: tiddler.title
    }
  });
  return tiddlerDoc;
}
