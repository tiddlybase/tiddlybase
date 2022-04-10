import type { AddNumbers, NotifyAdmin } from "@tiddlybase/functions/src/apis";
import type { User } from '@firebase/auth';

export const USER_FIELDS = ['emailVerified', 'displayName', 'photoURL', 'providerId', 'uid'] as const;

export type TiddlyBaseUser = Pick<User,typeof USER_FIELDS[number]>

export interface ChildInitProps {
  user: TiddlyBaseUser,
  isLocalEnv: boolean
}

export interface ParentAPI {
  childIframeReady: () => Promise<ChildInitProps>;
  getDownloadURL: (filename: string) => Promise<string>;
  addNumbers: AddNumbers;
  notifyAdmin: NotifyAdmin;
  authSignOut: () => Promise<void>;
  authDeleteAccount: () => Promise<void>;
}
