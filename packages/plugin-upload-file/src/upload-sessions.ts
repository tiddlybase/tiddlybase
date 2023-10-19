import { WithCleanupRPC } from "@tiddlybase/rpc/src/types";
import { UploadController, UploadEventHandler } from "@tiddlybase/shared/src/file-storage";
import { InvocationObserver } from "@tiddlybase/shared/src/invocation-observer";

export interface UploadSessionState {
  uploadObserver: InvocationObserver<UploadEventHandler>,
  uploadController: Promise<WithCleanupRPC<Partial<UploadController>>|undefined>,
  filename: string,
  filesize: number,
  path: string
}

const sessionStore:(UploadSessionState|undefined)[] = [];

export const createSession = (sessionState:UploadSessionState):number => {
  return sessionStore.push(sessionState) - 1;
}

export const destroySession = (sessionId: number) => {
  sessionStore[sessionId] = undefined;
}

export const getSession = (sessionId: number):UploadSessionState|undefined => {
  return sessionStore[sessionId];
}
