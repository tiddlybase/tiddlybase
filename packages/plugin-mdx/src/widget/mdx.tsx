import type {} from "@tiddlybase/tw5-types/src/index";

import {
  compile,
  getExports,
} from "@tiddlybase/plugin-mdx/src/mdx-client/mdx-client";
import { components as baseComponents } from "./components";
import type {
  WrappedPropsBase,
  ReactWrapper,
} from "@tiddlybase/plugin-react/src/react-wrapper";
import {
  TW5ReactContextType,
  withContext,
} from "@tiddlybase/plugin-react/src/components/TW5ReactContext";
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

const getCustomComponentProps = (
  context: TW5ReactContextType,
  definingTiddlerName?: string,
  components?: any
) => ({
  components,
  context,
  parentWidget: context.parentWidget,
  get currentTiddler() {
    return context.parentWidget?.wiki?.getTiddler(
      context.parentWidget?.getVariable("currentTiddler")
    );
  },
  get definingTiddler() {
    return !!definingTiddlerName
      ? context.parentWidget?.wiki?.getTiddler(definingTiddlerName)
      : undefined;
  },
});

/**
 * CustomComponentProps is the inteface presented to
 */
export type CustomComponentProps = ReturnType<typeof getCustomComponentProps>;

export const MDXFactory = async ({
  parentWidget,
  children,
  mdx,
  title,
}: MDXFactoryProps) => {
  let definingTiddlerTitle = title;
  if (definingTiddlerTitle === PARSER_TITLE_PLACEHOLDER) {
    definingTiddlerTitle = parentWidget?.getVariable("currentTiddler");
  }
  if (children) {
    console.log("MDX ignoring children", children);
  }
  const errorMessage = (e: Error | MDXErrorDetails, title?: string) => () =>
    isMDXErrorDetails(e)
      ? MDXError({ title, mdx, details: e, fatal: true })
      : JSError({ title, error: e });
  const components = { ...baseComponents, ...customComponents };
  const mdxContext = {
    components,
    React,
    withContext,
    render: (
      component: React.FunctionComponent<CustomComponentProps | null>
    ) => {
      return (ReactJSXRuntime as any).jsx(
        withContext(({ context }) => {
          try {
            return component(
              context
                ? getCustomComponentProps(
                    context,
                    definingTiddlerTitle,
                    components
                  )
                : null
            );
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
  const requires = new Set<string>([]);
  const importFn = async (requiredModuleName: string) => {
    // To require() a module, it must have been registered with TiddlyWiki
    // either at boot time (js modules) or because MDX has already compiled and
    // registered the generated module with TiddlyWiki. For MDX dependencies,
    // compile them now so they can be required if necessary
    if (
      $tw.wiki.getTiddler(requiredModuleName)?.fields?.type ===
      "text/x-markdown"
    ) {
      // called so the module is registered
      await MDXFactory({
        parentWidget,
        children: null,
        mdx: $tw.wiki.getTiddler(requiredModuleName)?.fields.text ?? "",
        title: requiredModuleName,
      });
    }
    // add require() dependency if requires field exists
    requires.add(requiredModuleName);
    return $tw.modules.execute(requiredModuleName, definingTiddlerTitle);
  };
  let compiledFn: any;
  let warnings: Array<MDXErrorDetails> = [];
  try {
    const compilationResult = await compile(
      definingTiddlerTitle ?? `$:/mdx_generated_${invocationCounter++}`,
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
  let dependencies: Set<string> = requires;
  if (definingTiddlerTitle !== undefined) {
    $tw.modules.define(definingTiddlerTitle, "library", mdxExports);
    $tw.modules.titles[definingTiddlerTitle].requires = requires;
    // only listen to changes to transitive dependencies is PatchedModules is
    // installed
    if (($tw.modules as any).getAllModulesRequiredBy !== undefined) {
      dependencies = ($tw.modules as any).getAllModulesRequiredBy(
        definingTiddlerTitle
      );
    }
  }
  (parentWidget as ReactWrapper).addChangedTiddlerHook(
    (changedTiddlers: $tw.ChangedTiddlers): boolean =>
      Object.keys(changedTiddlers).some(
        (title) => dependencies.has(title)
      )
  );
  return (props: any) => {
    try {
      return [
        ...warnings.map((details) => MDXError({ mdx, details })),
        mdxExports.default({ ...props, components: mdxContext.components }),
      ];
    } catch (e) {
      return JSError({
        title: "Error rendering default MDX component",
        error: e as Error,
      });
    }
  };
};
