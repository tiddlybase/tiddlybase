import type { } from "@tiddlybase/tw5-types/src/index";
import { TiddlerDataSourceSpec } from "./tiddlybase-config-schema";

export type TiddlerCollection = Record<string, $tw.TiddlerFields>;

export interface TiddlerDataSource {
  getAllTiddlers: () => Promise<TiddlerCollection>;
}

export interface WritableTiddlerDataSource extends TiddlerDataSource {
  getTiddler: (title: string) => Promise<$tw.TiddlerFields | undefined>;
  setTiddler: (tiddler: $tw.TiddlerFields) => Promise<$tw.TiddlerFields>;
  deleteTiddler: (title: string) => Promise<void>;
}

export interface TiddlerDataSourceChangeListener {
  onSetTiddler: (tiddler: $tw.TiddlerFields) => void;
  onDeleteTiddler: (title: string) => void;
}

export type TiddlerDataSourceWithSpec = {source: TiddlerDataSource, spec: TiddlerDataSourceSpec};
export type TiddlerProvenance = Record<string, TiddlerDataSourceWithSpec>;
