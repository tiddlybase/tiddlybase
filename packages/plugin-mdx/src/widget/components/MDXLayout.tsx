import { Widget } from "packages/tw5-types/src";
import { ReactNode } from "react";
import { MDXProps } from "../mdx-props";
import {TW5WidgetParentContext} from './TW5WidgetParentContext';

export type MDXLayoutArgs = Omit<MDXProps, 'mdx' | 'name'> & {
  children?: ReactNode|ReactNode[],
  parent: Widget
}

export const MDXLayout = ({children, parent}:MDXLayoutArgs) => {
  return (
    <TW5WidgetParentContext.Provider value={parent}>
      {children}
    </TW5WidgetParentContext.Provider>
  );
};
