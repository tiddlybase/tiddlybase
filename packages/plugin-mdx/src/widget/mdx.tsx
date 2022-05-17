import {
  compile,
  getComponent,
} from "@tiddlybase/plugin-mdx/src/mdx-client/mdx-client";
import { makeTW5Components } from "./components/TW5Components";
import type {WrappedPropsBase} from "@tiddlybase/plugin-react/src/react-wrapper";

export type MDXProps =
  WrappedPropsBase & {
      mdx: string;
      name?: string;
    } & Record<string, string>;

const MDX = ({ parentWidget, mdx, name = "compiledMDX", ...additionalProps }: MDXProps) => {
  console.log("building mdx");
  const mdxContext = {
    getVariable: parentWidget.getVariable.bind(this),
    wiki: parentWidget.wiki,
    parentWidget,
  };
  const components = makeTW5Components(parentWidget);
  const contextKeys: string[] = Object.keys(mdxContext).sort();
  const contextValues: any[] = contextKeys.reduce((acc, key) => {
    acc.push((mdxContext as any)[key]);
    return acc;
  }, [] as any[]);
  const compiledFn = compile(name, mdx, contextKeys);
  const importFn = require;
  return getComponent(
    compiledFn,
    importFn,
    components,
    contextValues,
    additionalProps
  );
};

export { MDX };
