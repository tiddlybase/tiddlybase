import type {} from "@tiddlybase/tw5-types/src/index";

import {
  compile,
  getExports,
} from "@tiddlybase/plugin-mdx/src/mdx-client/mdx-client";
import { components as baseComponents, makeWikiLink } from "./components/TW5Components";
import type { WrappedPropsBase } from "@tiddlybase/plugin-react/src/react-wrapper";
import { ReactWrapperError } from "@tiddlybase/plugin-react/src/react-wrapper";
import { withContext } from "@tiddlybase/plugin-react/src/components/TW5ReactContext";
import React from "react";
import * as ReactJSXRuntime from "react/jsx-runtime";

export type MDXFactoryProps = WrappedPropsBase & {
  mdx: string;
  title?: string;
};

export type MDXMetadata = {
  dependencies: string[];
};

let invocationCounter = 0;

export const PARSER_TITLE_PLACEHOLDER = "__parser_didnt_know__";

const customComponents: Record<string, React.FunctionComponent> = {};

export const registerComponent = (
  name: string,
  component: React.FunctionComponent
) => {
  customComponents[name] = component;
};

export const MDXFactory = async ({
  parentWidget,
  children,
  mdx,
  title: name,
}: MDXFactoryProps) => {
  const definingTiddlerName: string | undefined =
    name === PARSER_TITLE_PLACEHOLDER
      ? parentWidget?.getVariable("currentTiddler")
      : name;
  if (children) {
    console.log("MDX ignoring children", children);
  }
  const mdxContext = {
    React,
    withContext,
    render: (component: React.FunctionComponent) => {
      return (ReactJSXRuntime as any).jsx(
        withContext(({ context }) =>
          component({
            context,
            parentWidget: context?.parentWidget,
            tiddler: context?.parentWidget?.wiki?.getTiddler(
              context?.parentWidget?.getVariable("currentTiddler")
            ),
            link: (targetTiddler: string, label?: string) => makeWikiLink(context, targetTiddler, label)
          })
        ),
        {} // no props passed
      );
    },
    wiki: parentWidget?.wiki ?? $tw.wiki
  };
  const contextKeys: string[] = Object.keys(mdxContext).sort();
  const contextValues: any[] = contextKeys.reduce((acc, key) => {
    acc.push((mdxContext as any)[key]);
    return acc;
  }, [] as any[]);
  const mdxMetadata: MDXMetadata = {
    dependencies: [],
  };
  const components = { ...baseComponents, ...customComponents };
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
    try {
      return mdxExports.default({ ...props, components });
    } catch (e) {
      return ReactWrapperError(e as Error)
    }
  };
};
