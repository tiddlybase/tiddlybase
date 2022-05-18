import {
  compile,
  getComponent,
} from "@tiddlybase/plugin-mdx/src/mdx-client/mdx-client";
import { makeTW5Components } from "./components/TW5Components";
import type {ExtraProps, WrappedPropsBase} from "@tiddlybase/plugin-react/src/react-wrapper";

export type MDXProps =
  WrappedPropsBase & {
      mdx: string;
      name?: string;
    } & ExtraProps;

const MDX = ({ parentWidget, children, require: importFn, mdx, name = "compiledMDX", ...props }: MDXProps) => {
  if (children) {
    console.log("MDX ignoring children", children);
  }
  const mdxContext = {
    getVariable: parentWidget.getVariable.bind(this),
    wiki: parentWidget.wiki,
    parentWidget,
    props
  };
  const components = makeTW5Components(parentWidget);
  const contextKeys: string[] = Object.keys(mdxContext).sort();
  const contextValues: any[] = contextKeys.reduce((acc, key) => {
    acc.push((mdxContext as any)[key]);
    return acc;
  }, [] as any[]);
  const compiledFn = compile(name, mdx, contextKeys);
  return getComponent(
    compiledFn,
    importFn,
    components,
    contextValues,
    props
  );
};

export { MDX };
