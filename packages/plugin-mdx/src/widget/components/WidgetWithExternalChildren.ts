import { Widget } from "@tiddlybase/tw5-types/src";

export interface WidgetWithExternalChildren extends Widget {
  addExternalChild: (child:Widget)=>void;
  removeExternalChild: (child:Widget)=>void;
}
