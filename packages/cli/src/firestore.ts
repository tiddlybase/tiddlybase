import type { } from "@tiddlybase/tw5-types/src/index";
import * as admin from 'firebase-admin';
import { default as merge } from 'lodash.merge';
import { Argv, CommandModule } from 'yargs';
import { CLIContext, withCLIContext } from './cli-context';
import {rawReadJSON} from './config'

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

// TODO: migrate this to firestore-based ACL instead of custom JWT claims
export const firestoreQuery: CommandModule = {
  command: 'firestore-query <filename>',
  describe: 'Query database',
  builder: (argv: Argv) =>
    argv
      .positional('filename', {
        describe: 'JSON file with query',
        type: 'string',
      })
      ,
  handler: withCLIContext(async (cliContext: CLIContext) => {
    const filename = cliContext.args.filename as string;
    const query = rawReadJSON(filename);
    const firestore = cliContext.app.firestore();
    let obj:any = firestore;
    for (let fn_call of query) {
      const args = fn_call.slice(1).map((l:any) => {
        if (Array.isArray(l)) {
          return new admin.firestore.FieldPath(...l)
        }
        return l
      })
      obj = obj[fn_call[0]].apply(obj, args)
    }
    try {
      const querySnapshot = await obj.get();
      querySnapshot.forEach((doc:any) => {
        console.log(doc.id, ' => ', doc.data());
      });
    } catch (e:any) {
      console.log(String(e));
    }
  })
};
