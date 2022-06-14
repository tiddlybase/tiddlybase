/// <reference types="@tiddlybase/tw5-types/src/tiddlybase" />

import {
  compile,
  getExports,
} from "@tiddlybase/plugin-mdx/src/mdx-client/mdx-client";
import { components } from "./components/TW5Components";
import type { WrappedPropsBase } from "@tiddlybase/plugin-react/src/react-wrapper";
import {withContext} from "@tiddlybase/plugin-react/src/components/TW5ReactContext";



export type MDXFactoryProps = WrappedPropsBase & {
  mdx: string;
  title?: string;
};

export type MDXMetadata = {
  dependencies: string[];
};

let invocationCounter = 0;

export const PARSER_TITLE_PLACEHOLDER = "__parser_didnt_know__"

export const MDXFactory = async ({
  parentWidget,
  children,
  mdx,
  title: name,
}: MDXFactoryProps) => {
  const definingTiddlerName:string|undefined = name === PARSER_TITLE_PLACEHOLDER ? parentWidget?.getVariable("currentTiddler") : name;
  if (children) {
    console.log("MDX ignoring children", children);
  }
  const mdxContext = {
    withContext,
    wiki: parentWidget?.wiki ?? $tw.wiki,
  };
  const contextKeys: string[] = Object.keys(mdxContext).sort();
  const contextValues: any[] = contextKeys.reduce((acc, key) => {
    acc.push((mdxContext as any)[key]);
    return acc;
  }, [] as any[]);
  const mdxMetadata: MDXMetadata = {
    dependencies: [],
  };
  const importFn = async (mdxTiddlerName: string) => {
    // To require() a module, it must have been registered with TiddlyWiki
    // either at boot time (js modules) or because MDX has already compiled and
    // registered the generated module with TiddlyWiki. For MDX dependencies,
    // compile them now so they can be required if necessary
    if (
      mdxTiddlerName &&
      !(mdxTiddlerName in $tw.modules.titles) &&
      $tw.wiki.getTiddler(mdxTiddlerName)?.fields?.type === "text/x-markdown"
    ) {
      // called so the module is registered
      await MDXFactory({
        parentWidget,
        children: null,
        mdx: $tw.wiki.getTiddler(mdxTiddlerName)?.fields.text ?? "",
        title: mdxTiddlerName,
      });
    }
    mdxMetadata.dependencies.push(mdxTiddlerName);
    return $tw.modules.execute(mdxTiddlerName, definingTiddlerName);
  };
  const compiledFn = await compile(
    definingTiddlerName ?? `$:/mdx_generated_${invocationCounter++}`,
    mdx,
    contextKeys
  );
  const mdxExports = await getExports(
    compiledFn,
    importFn,
    components,
    contextValues
  );
  mdxExports.mdxMetadata = mdxMetadata;
  if (definingTiddlerName) {
    $tw.modules.define(definingTiddlerName, "library", mdxExports);
  }
  return (props: any) => {
    // console.log("running default");
    return mdxExports.default({ ...props, components })
  };
};
