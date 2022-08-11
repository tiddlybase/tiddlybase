import type { } from '@tiddlybase/tw5-types/src/index'
import type { AddNumbers, NotifyAdmin } from "@tiddlybase/functions/src/apis";
import type { User } from '@firebase/auth';
import { ParentAPIBase } from "./base";
import { WikiLaunchConfig } from "@tiddlybase/shared/src/tiddlybase-config-schema"

export const USER_FIELDS = ['emailVerified', 'displayName', 'photoURL', 'providerId', 'uid'] as const;

export type TiddlyBaseUser = Pick<User, typeof USER_FIELDS[number]>

export interface ChildInitProps {
  user: TiddlyBaseUser,
  launchConfig: WikiLaunchConfig,
  storageConfig: $tw.StorageConfig,
  isLocal: boolean,
  parentLocation: Partial<Location>
}

export interface TopLevelAPIForSandboxedWiki extends ParentAPIBase<ChildInitProps> {
  getDownloadURL: (filename: string) => Promise<string>;
  authSignOut: () => Promise<void>;
  authDeleteAccount: () => Promise<void>;
  loadError: (message: string) => Promise<void>;
  // exposed firebase functions
  addNumbers: AddNumbers;
  notifyAdmin: NotifyAdmin;
}
