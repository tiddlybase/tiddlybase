import type { PermissionedStorage } from '@tiddlybase/shared/src/instance-spec-schema';
import { FirebaseError } from '@firebase/util'
import { objFilter } from '@tiddlybase/shared/src/obj-utils';
import { getFirestore } from "@firebase/firestore"
import { FirebaseApp } from "@firebase/app"
import { Lazy } from "@tiddlybase/shared/src/lazy";
import { LaunchParameters } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

export const normalizeFirebaseReadError = (e: any, instance: string, collection: string, resourceType: PermissionedStorage, operation?: string): Partial<Error> => {
  let message = `Error reading instance ${instance} ${resourceType} collection ${collection}`;
  if (operation) {
    message += ` during operation ${operation}`
  }
  if (e instanceof FirebaseError) {
    message += `: ${e.message}`;
    return { ...objFilter((k, v) => typeof v === 'string', e) as FirebaseError, message };
  } else {
    message += `: ${e ? e.toString() : String(e)}`;
    return { message }
  }
}

export const writeFirestoreDoc = async (
  lazyFirebaseApp: Lazy<FirebaseApp>,
  launchParameters: LaunchParameters,
  path: string,
  tiddler: $tw.TiddlerFields,
  clientId: number | undefined = 0
) => {
  const firestore = getFirestore(lazyFirebaseApp());
  const docRef = doc(firestore, path);
  try {
    await setDoc(docRef, {
      tiddler: {
        ...tiddler,
        created: tiddler.created || serverTimestamp(),
        creator: tiddler.creator || launchParameters.userId,
        modifier: launchParameters.userId,
        modified: serverTimestamp(),
      },
      clientId
    });
  } catch (e) {
    throw normalizeFirebaseReadError(e, "(none)", path, 'firestore', 'writeFirestoreDoc');
  }
}

