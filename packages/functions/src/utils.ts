import * as functions from 'firebase-functions';

export const assertAuthenticated = (context:functions.https.CallableContext) => {
  if (!context?.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'You must log in to use this function');
  }
}
