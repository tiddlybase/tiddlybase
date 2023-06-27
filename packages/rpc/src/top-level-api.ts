import type { } from '@tiddlybase/tw5-types/src/index'
import type { AddNumbers, NotifyAdmin } from "@tiddlybase/functions/src/apis";
import { ParentAPIBase } from "./base";
import type { WritableTiddlerDataSource } from "@tiddlybase/shared/src/tiddler-data-source";
import type { WritableFileDataSource } from "@tiddlybase/shared/src/file-data-source";
import type { TiddlyBaseUser } from "@tiddlybase/shared/src/users";


export interface ChildInitProps {
  user: TiddlyBaseUser,
  tiddlers: $tw.TiddlerFields[],
  wikiInfoConfig: Partial<$tw.WikiInfoConfig>,
  parentLocation: Partial<Location>
}

export interface AuthAPI {
  signOut: () => Promise<void>;
}

export interface BackendFunctions {
  // exposed firebase functions
  addNumbers: AddNumbers;
  notifyAdmin: NotifyAdmin;
}

export interface TopLevelUIAPI {
  loadError: (message: string) => Promise<void>;
}

export interface TopLevelAPIForSandboxedWiki extends ParentAPIBase<ChildInitProps>, WritableTiddlerDataSource, WritableFileDataSource, AuthAPI, BackendFunctions, TopLevelUIAPI {}
