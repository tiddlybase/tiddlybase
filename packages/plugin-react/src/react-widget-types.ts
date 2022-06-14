import type { Root } from "react-dom/client";

export interface WidgetWithExternalChildren extends $tw.Widget {
  addExternalChild: (child:$tw.Widget)=>void;
  removeExternalChild: (child:$tw.Widget)=>void;
}

export type ReactRenderable = Parameters<Root["render"]>[0];
