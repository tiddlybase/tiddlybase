import type { } from "@tiddlybase/tw5-types/src/index";

export interface TiddlerSource {
  getAllTiddlers: () => Promise<Record<string, $tw.TiddlerFields>>;
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
