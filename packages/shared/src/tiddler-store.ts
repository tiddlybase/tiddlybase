import type { } from "@tiddlybase/tw5-types/src/index";
import { TiddlerSourceSpec } from "./tiddlybase-config-schema";

export type TiddlerCollection = Record<string, $tw.TiddlerFields>;

export interface TiddlerSource {
  getAllTiddlers: () => Promise<TiddlerCollection>;
}

export interface TiddlerStore extends TiddlerSource{
  getTiddler: (title: string) => Promise<$tw.TiddlerFields | undefined>;
  setTiddler: (tiddler: $tw.TiddlerFields) => Promise<$tw.TiddlerFields>;
  deleteTiddler: (title: string) => Promise<void>;
}

export interface TiddlerChangeListener {
  onSetTiddler: (tiddler: $tw.TiddlerFields) => void;
  onDeleteTiddler: (title: string) => void;
}

export type TiddlerSourceWithSpec = {source: TiddlerSource, spec: TiddlerSourceSpec};
export type TiddlerProvenance = Record<string, TiddlerSourceWithSpec>;
