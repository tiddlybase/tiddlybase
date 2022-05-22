import { Widget } from "@tiddlybase/tw5-types/src";
import React, { createContext, ReactChild, useContext } from "react";
import type { FunctionComponent } from 'react';

export type TW5ReactContextType = {
  parentWidget: Widget;
};

export const TW5ReactContext = createContext<TW5ReactContextType|null>(null);

export type WithContextProps = {
  context: TW5ReactContextType;
  Component: FunctionComponent<any>,
  props: any
};

export const LogContext = () => {
  const value = useContext(TW5ReactContext);
  console.log("context is", value);
  return (<div>context has been logged</div>);
}

export const NonContextualComponent = ({children}:{children:ReactChild}) => {
  console.log("rendering NonContextualComponent");
  return (<div>{children}</div>);
}

export const withContext = ({
  context,
  Component,
  props
}: WithContextProps) => (
  <React.StrictMode>
    <TW5ReactContext.Provider value={context}>
      <Component {...{props}} />
    </TW5ReactContext.Provider>
  </React.StrictMode>
);
