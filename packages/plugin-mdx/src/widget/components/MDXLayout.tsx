import { ReactNode } from "react";
import { MDXProps } from "../mdx-props";
import {TW5WidgetParentContext} from './TW5WidgetParentContext';
import { WidgetWithExternalChildren } from "./WidgetWithExternalChildren";

export type MDXLayoutArgs = Omit<MDXProps, 'mdx' | 'name'> & {
  children?: ReactNode|ReactNode[],
  parent: WidgetWithExternalChildren
}

export const MDXLayout = ({children, parent}:MDXLayoutArgs) => {
  return (
    <TW5WidgetParentContext.Provider value={parent}>
      {children}
    </TW5WidgetParentContext.Provider>
  );
};
