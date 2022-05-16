import type { Widget } from "@tiddlybase/tw5-types/src";
import type { Root } from "react-dom/client";

export interface WidgetWithExternalChildren extends Widget {
  addExternalChild: (child:Widget)=>void;
  removeExternalChild: (child:Widget)=>void;
}

export type ReactRenderable = Parameters<Root["render"]>[0];
