import { Widget } from "@tiddlybase/tw5-types/src";
import React, { createContext, useContext } from "react";
import type { FunctionComponent } from 'react';

export type TW5ReactContextType = {
  parentWidget: Widget;
};

export const TW5ReactContext = createContext<TW5ReactContextType|null>(null);

export type WithContextProviderProps = {
  context: TW5ReactContextType;
  Component: FunctionComponent<any>,
  props: any
};

export type ContextProps = {
  context: TW5ReactContextType|null
}

export const withContext = <P extends {}>(Component:FunctionComponent<P & ContextProps>, props:P) => {
  const context = useContext(TW5ReactContext);
  return Component({...props, context});
}

export const withContextProvider = ({
  context,
  Component,
  props
}: WithContextProviderProps) => (
  <React.StrictMode>
    <TW5ReactContext.Provider value={context}>
      <Component {...{props}} />
    </TW5ReactContext.Provider>
  </React.StrictMode>
);
