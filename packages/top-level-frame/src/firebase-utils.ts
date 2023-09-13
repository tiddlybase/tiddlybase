import type {PermissionedDataSource} from '@tiddlybase/shared/src/instance-spec-schema';
import {FirebaseError} from '@firebase/util'
import { objFilter } from '@tiddlybase/shared/src/obj-utils';

export const normalizeFirebaseReadError = (e:any, instance:string, collection:string, resourceType: PermissionedDataSource): Partial<Error> => {
  let message =  `Error reading instance ${instance} ${resourceType} collection ${collection}`;
  if (e instanceof FirebaseError) {
    message += `: ${e.message}`;
    return {...objFilter((k, v) => typeof v === 'string', e) as FirebaseError, message};
  } else {
    message += `: ${e ? e.toString() : String(e)}`;
    return {message}
  }
}
