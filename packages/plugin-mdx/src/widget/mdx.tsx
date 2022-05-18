import {
  compile,
  getComponent,
} from "@tiddlybase/plugin-mdx/src/mdx-client/mdx-client";
import { makeTW5Components } from "./components/TW5Components";
import type {WrappedPropsBase} from "@tiddlybase/plugin-react/src/react-wrapper";

export type MDXFactoryProps =
  WrappedPropsBase & {
      mdx: string;
      name?: string;
    }

export const MDXFactory = async ({ parentWidget, children, require, mdx, name = "compiledMDX"}: MDXFactoryProps) => {
  if (children) {
    console.log("MDX ignoring children", children);
  }
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
  const importFn = async (id:string) => require(id);
  const compiledFn = await compile(name, mdx, contextKeys);
  return await getComponent(
    compiledFn,
    importFn,
    components,
    contextValues,
  );
};
