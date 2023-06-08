import {initializeApp} from '@firebase/app'
import {getAuth} from '@firebase/auth'
import type { User } from '@firebase/auth';
import * as firebaseui from 'firebaseui';
import type { LaunchConfig, TiddlybaseClientConfig } from '@tiddlybase/shared/src/tiddlybase-config-schema';
import type { FirebaseStorage } from '@firebase/storage';
import type { Firestore } from '@firebase/firestore';
import type { Functions } from '@firebase/functions'
import type MiniIframeRPC from 'mini-iframe-rpc';
import type { APIDefiner} from "@tiddlybase/rpc/src";
import type { APIClient } from "@tiddlybase/rpc/src";
import type { SandboxedWikiAPIForTopLevel } from "@tiddlybase/rpc/src/sandboxed-wiki-api";
import type { TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";


export type StartTW5 = (user: User) => Promise<void>;

export interface FirebaseState {
  app: ReturnType<typeof initializeApp>,
  auth: ReturnType<typeof getAuth>,
  ui: firebaseui.auth.AuthUI,
  tiddlybaseClientConfig: TiddlybaseClientConfig,
  launchConfig: LaunchConfig
}

export interface FirebaseAPIs {
  storage?: FirebaseStorage;
  firestore?: Firestore;
  functions?: Functions;
}

export interface RPC {
  rpc: MiniIframeRPC;
  sandboxedAPIClient: APIClient<SandboxedWikiAPIForTopLevel>;
  toplevelAPIDefiner: APIDefiner<TopLevelAPIForSandboxedWiki>;
}
