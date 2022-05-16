import { Widget } from "@tiddlybase/tw5-types/src";
import { createContext } from "react";
import { ReactRenderable } from "../react-widget-types";

export const WidgetParentContext =
  createContext<Widget | null>(null);

export type WidgetContextProps = {
  children: ReactRenderable;
  parent: Widget;
};

export const renderWithContext = ({
  parent,
  children
}: WidgetContextProps) => (
  <WidgetParentContext.Provider value={parent}>
    {children}
  </WidgetParentContext.Provider>
);
