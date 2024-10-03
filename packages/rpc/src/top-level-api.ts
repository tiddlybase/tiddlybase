import type { } from '@tiddlybase/tw5-types/src/index'
import type { AddNumbers, NotifyAdmin } from "@tiddlybase/functions/src/apis";
import { ParentAPIBase } from "./base";
import type { TiddlerStorage } from "@tiddlybase/shared/src/tiddler-storage";
import type { FileStorage } from "@tiddlybase/shared/src/file-storage";
import type { WikiViewState } from "@tiddlybase/shared/src/wiki-view-state";

export interface ChildInitProps {
  tiddlers: $tw.TiddlerFields[]
}

export interface AuthAPI {
  signOut: () => Promise<void>;
}

export interface CompletionAPI {
  generateCompletion: (prompt:string) => Promise<string>;
}

export interface InstanceManagment {
  createInstance: (instance:string) => Promise<boolean>;
}

export interface BackendFunctions {
  // exposed firebase functions
  addNumbers: AddNumbers;
  notifyAdmin: NotifyAdmin;
}

export interface TopLevelUIAPI {
  loadError: (message: string) => Promise<void>;
  loginScreen: () => Promise<void>;
  changeURL: (
    wikiViewState: WikiViewState,
    pathVariables: Record<string, string>,
    searchVariables?: Record<string, string>,
    hash?: string
  ) => Promise<string>;
}

export interface TopLevelAPIForSandboxedWiki extends
  ParentAPIBase<ChildInitProps>,
  TiddlerStorage,
  FileStorage,
  AuthAPI,
  BackendFunctions,
  CompletionAPI,
  TopLevelUIAPI,
  InstanceManagment {
  }
