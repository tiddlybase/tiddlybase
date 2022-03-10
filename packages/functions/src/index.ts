import 'source-map-support/register';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { AddNumbers, CallableFunctionHandler, NotifyAdmin } from './apis';
import { assertAuthenticated } from './utils';
import { sendEmail } from './mailer';

// based on: https://github.com/firebase/quickstart-js/blob/master/functions/functions/index.js

admin.initializeApp();

const addNumbers:CallableFunctionHandler<AddNumbers> = async (data, context) => {

  const firstNumber = data.firstNumber;
  const secondNumber = data.secondNumber;
  console.log(`invoked by ${context?.auth?.uid}`)

  if (!Number.isFinite(firstNumber) || !Number.isFinite(secondNumber)) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
      'two arguments "firstNumber" and "secondNumber" which must both be numbers.');
  }

  return {
    firstNumber: firstNumber,
    secondNumber: secondNumber,
    operator: '+',
    operationResult: firstNumber + secondNumber,
  };
}

const notifyAdmin:CallableFunctionHandler<NotifyAdmin> = async ({subject, body}, context) => {
  assertAuthenticated(context);
  await sendEmail({
    from: "peter.neumark.jetfabric@gmail.com",
    to: "peter@peterneumark.com",
    subject,
    text: body,
    html: body});
};

exports.addNumbers = functions.region('europe-west3').https.onCall(addNumbers);
exports.notifyAdmin = functions.region('europe-west3').https.onCall(notifyAdmin);
