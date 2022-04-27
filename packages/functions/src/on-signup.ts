import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendEmail } from './mailer';
import { REGION } from './constants';

// TODO: move these into configuration variables

const CUSTOM_CLAIMS = {wiki: true};

const EMAIL_SUBJECT = "Sikeres feliratkozás!"
const EMAIL_BODY = "Gratula! :)"

export const makeOnSignup = (app:admin.app.App) => functions.region(REGION).auth.user().onCreate(async (user) => {
  const whitelist = JSON.parse(functions.config().signup?.whitelist || '[]') as string[];
  if (user.email && whitelist.includes(user.email)) {
    await app.auth().setCustomUserClaims(user.uid, CUSTOM_CLAIMS);
    await sendEmail({
      from: "peter.neumark.jetfabric@gmail.com",
      to: user.email,
      subject: EMAIL_SUBJECT,
      text: EMAIL_BODY,
      html: EMAIL_BODY});
  }
});
