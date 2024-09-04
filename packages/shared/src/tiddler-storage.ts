import type { } from "@tiddlybase/tw5-types/src/index";
import { TiddlerStorageSpec } from "./tiddlybase-config-schema";

export type TiddlerCollection = Record<string, $tw.TiddlerFields>;

export interface ReadOnlyTiddlerStorage {
  getAllTiddlers: () => Promise<TiddlerCollection>;
}

export interface TiddlerStorage extends ReadOnlyTiddlerStorage {
  canAcceptTiddler: (tiddler: $tw.TiddlerFields) => boolean;
  getTiddler: (title: string) => Promise<$tw.TiddlerFields | undefined>;
  setTiddler: (tiddler: $tw.TiddlerFields) => Promise<$tw.TiddlerFields>;
  deleteTiddler: (title: string) => Promise<void>;
}

export interface TiddlerStorageChangeListener {
  onSetTiddler: (tiddler: $tw.TiddlerFields) => void;
  onDeleteTiddler: (title: string) => void;
}

export type TiddlerStorageWithSpec = {sourceIndex: number, storage: TiddlerStorage, spec: TiddlerStorageSpec};
// maps tiddler title to tiddler storage index
export type TiddlerProvenance = Record<string, number>;
