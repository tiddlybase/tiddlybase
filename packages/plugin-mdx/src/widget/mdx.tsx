import type {} from "@tiddlybase/tw5-types/src/index";

import {
  compile,
  getExports,
} from "@tiddlybase/plugin-mdx/src/mdx-client/mdx-client";
import {
  components as baseComponents,
  makeWikiLink,
} from "./components/TW5Components";
import type { WrappedPropsBase } from "@tiddlybase/plugin-react/src/react-wrapper";
import { withContext } from "@tiddlybase/plugin-react/src/components/TW5ReactContext";
import React from "react";
import * as ReactJSXRuntime from "react/jsx-runtime";
import { isMDXErrorDetails, MDXError } from "./components/MDXError";
import { JSError } from "packages/plugin-react/src/components/JSError";
import type { MDXErrorDetails } from "../mdx-client/mdx-error-details";

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
  const errorMessage = (e: Error | MDXErrorDetails, title?: string) => () =>
  isMDXErrorDetails(e)
    ? MDXError({ title, mdx, details: e, fatal: true })
    : JSError({ title, error: e });
  const mdxContext = {
    React,
    withContext,
    render: (component: React.FunctionComponent) => {
      return (ReactJSXRuntime as any).jsx(
        withContext(({ context }) => {
          try {
            return component({
              context,
              parentWidget: context?.parentWidget,
              tiddler: context?.parentWidget?.wiki?.getTiddler(
                context?.parentWidget?.getVariable("currentTiddler")
              ),
              link: (targetTiddler: string, label?: string) =>
                makeWikiLink(context, targetTiddler, label),
            });
          } catch (e) {
            return errorMessage(
              e as Error | MDXErrorDetails,
              "Error rendering component passed to render() helper function"
            )();
          }
        }),
        {} // no props passed
      );
    },
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
  let compiledFn: any;
  let warnings: Array<MDXErrorDetails> = [];
  try {
    const compilationResult = await compile(
      definingTiddlerName ?? `$:/mdx_generated_${invocationCounter++}`,
      mdx,
      contextKeys
    );
    if ("error" in compilationResult) {
      return errorMessage(
        compilationResult.error as Error | MDXErrorDetails,
        "Error compiling MDX source"
      );
    }
    compiledFn = compilationResult.compiledFn;
    warnings = compilationResult.warnings;
  } catch (e) {
    return errorMessage(
      e as Error | MDXErrorDetails,
      "Error compiling MDX source 2"
    );
  }
  let mdxExports: any;
  try {
    mdxExports = await getExports(compiledFn, importFn, contextValues);
  } catch (e) {
    return errorMessage(
      e as Error | MDXErrorDetails,
      "Error executing compiled MDX"
    );
  }

  mdxExports.mdxMetadata = mdxMetadata;
  if (definingTiddlerName) {
    $tw.modules.define(definingTiddlerName, "library", mdxExports);
  }
  return (props: any) => {
    try {
      return [
        ...warnings.map((details) => MDXError({ mdx, details })),
        mdxExports.default({ ...props, components }),
      ];
    } catch (e) {
      return JSError({
        title: "Error rendering default MDX component",
        error: e as Error,
      });
    }
  };
};
