import type { } from "@tiddlybase/tw5-types/src/index";
import { TiddlerStorageSpec } from "./tiddlybase-config-schema";

export type TiddlerCollection = Record<string, $tw.TiddlerFields>;

export interface ReadOnlyTiddlerStorage {
  getAllTiddlers: () => Promise<TiddlerCollection>;
  /**
   * isTiddlerPinned returns true if the tiddler should not be saved to another
   * TiddlerStorage instance, even if the given instance's canAcceptTiddler()
   * function returns false.
   * If the TiddlerStorage instance doesn't store the given tiddler, it should
   * return false.
   * @param tiddler
   * @returns boolean
   */
  isTiddlerPinned: (tiddler: $tw.TiddlerFields) => boolean;
}

export interface TiddlerStorage extends ReadOnlyTiddlerStorage {
  /**
   * canAcceptTiddler returns true if the given tiddler can be stored in the
   * TiddlerStorage instance.
   * @param tiddler
   * @returns boolean
   */
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
