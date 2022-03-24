import type { AddNumbers, NotifyAdmin } from "@firebase-auth-loader/functions/src/apis";

export interface ChildInitProps {
  userName: string
  isLocalEnv: boolean
}

export interface ParentAPI {
  childIframeReady: () => Promise<ChildInitProps>;
  getDownloadURL: (filename:string) => Promise<string>;
  addNumbers: AddNumbers;
  notifyAdmin: NotifyAdmin;
}
