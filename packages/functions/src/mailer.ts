// based on https://nodemailer.com/about/#example
import {createTransport} from 'nodemailer';
import * as functions from 'firebase-functions';

export interface Email {
  from: string,
  to: string,
  subject: string,
  text: string,
  html: string,
}

/*
var message = {
  from: "peter.neumark.jetfabric@gmail.com",
  to: "peter@peterneumark.com",
  subject: "TEST",
  text: "TESTTEST1",
  html: "<p>TESTTEST2</p>"
  };
*/

export const sendEmail = async (email:Email) => {

  const auth = {
    user: functions.config().smtp?.user,
    pass: functions.config().smtp?.password
  };
  // based on https://improvmx.com/guides/send-emails-using-gmail/
  let transporter = createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth
  });

  return transporter.sendMail(email);
}


