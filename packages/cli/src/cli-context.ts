import * as admin from 'firebase-admin';
import { cert } from 'firebase-admin/app';
import { Arguments } from 'yargs';
import { rawReadJSON } from './config';

export class CLIContext {
  public app: admin.app.App
  public args: Arguments;
  public constructor(args: Arguments) {
    this.args = args
    const serviceAccount = rawReadJSON(args['k'] as string);
    this.app = admin.initializeApp({
      credential: cert(serviceAccount)
    });
  }
  public async close():Promise<void> {
    await admin.app().delete();
  }
}

export type CLIContextHandler = (cliContext:CLIContext) => void | Promise<void>;

export const withCLIContext = (handler:CLIContextHandler) => async (args: Arguments) => {
  const cliContext = new CLIContext(args);
  try {
    return await handler(cliContext);
  } finally {
    await cliContext.close();
  }
}
