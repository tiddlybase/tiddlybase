import type { } from '@tiddlybase/tw5-types/src/index'
import type { AddNumbers, NotifyAdmin } from "@tiddlybase/functions/src/apis";
import { ParentAPIBase } from "./base";
import type { TiddlerStore } from "@tiddlybase/shared/src/tiddler-store";
import type { TiddlyBaseUser } from "@tiddlybase/shared/src/users";


export interface ChildInitProps {
  user: TiddlyBaseUser,
  tiddlers: $tw.TiddlerFields[],
  storageConfig: $tw.StorageConfig,
  wikiInfoConfig: Partial<$tw.WikiInfoConfig>,
  isLocal: boolean,
  parentLocation: Partial<Location>
}

export interface StorageFileMetadata {
  contentType?: string,
  name: string,
  timeCreated: string,
  timeUpdated: string,
  size: number,
  md5Hash?: string
}

export interface StorageAPI {
  getStorageFileAsBlob: (filename: string) => Promise<Blob>;
  getStorageFileMetadata: (filename: string) => Promise<StorageFileMetadata>;
  getStorageFileDownloadUrl: (filename: string) => Promise<string>;
}

export interface AuthAPI {
  authSignOut: () => Promise<void>;
  authDeleteAccount: () => Promise<void>;
}

export interface BackendFunctions {
  // exposed firebase functions
  addNumbers: AddNumbers;
  notifyAdmin: NotifyAdmin;
}

export interface TopLevelUIAPI {
  loadError: (message: string) => Promise<void>;
}

export interface TopLevelAPIForSandboxedWiki extends ParentAPIBase<ChildInitProps>, TiddlerStore, StorageAPI, AuthAPI, BackendFunctions, TopLevelUIAPI {}
