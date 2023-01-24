import type { } from "@tiddlybase/tw5-types/src/index";

import {
  TW5ReactContextType,
  withContext
} from "@tiddlybase/plugin-react/src/components/TW5ReactContext";
import type {
  ReactWrapper, WrappedPropsBase
} from "@tiddlybase/plugin-react/src/react-wrapper";
import { JSError } from "packages/plugin-react/src/components/JSError";
import React, { ReactNode } from "react";
import * as ReactJSXRuntime from "react/jsx-runtime";
import type { MDXErrorDetails } from "../mdx-client/mdx-error-details";
import { components as baseComponents } from "./components";
import { MDXError } from "./components/MDXError";
import { CompilationResult, MDXModuleLoader } from "./mdx-module-loader";
import { mdxModuleLoader } from "./global";
import { getTransitiveMDXModuleDependencies } from "./module-utils";

export type MDXFactoryProps = WrappedPropsBase & {
  mdx: string;
  title?: string;
  loader?: MDXModuleLoader;
};

export const PARSER_TITLE_PLACEHOLDER = "__parser_didnt_know__";

// holds a set of custom components which other plugins can hook into using
// registerComponent()
const customComponents: Record<string, React.FunctionComponent> = {};

export const registerComponent = (
  name: string,
  component: React.FunctionComponent
) => {
  customComponents[name] = component;
};

const getBuiltinComponents = () => ({ ...baseComponents, ...customComponents });

const getRenderProps = (
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

export const reportCompileError = (error: MDXErrorDetails, mdx?: string, title?: string) => MDXError({ title, mdx, details: error, fatal: true });

export const reportRuntimeError = (error: Error, title?: string) => JSError({ title, error });

const makeMDXContext = (
  definingTiddlerTitle?: string,
) => {
  const components = getBuiltinComponents();
  const mdxContext = {
    definingTiddlerTitle,
    components,
    render: (
      component: React.FunctionComponent<ReturnType<typeof getRenderProps>>
    ) => {
      return (ReactJSXRuntime as any).jsx(
        withContext(({ context }) => {
          if (!context) {
            return reportRuntimeError(new Error("No react context available to render()."));
          }
          try {
            return component(getRenderProps(
              context,
              definingTiddlerTitle,
              components));
          } catch (e) {
            return reportRuntimeError(e as Error, "Error in dynamic component passed to render().");
          }
        }),
        {} // no props passed
      );
    },
  };
  return mdxContext;
};

const addTiddlerChangeHook = async (
  parentWidget: ReactWrapper,
  definingTiddlerTitle: string,
  loader: MDXModuleLoader
) => {
  // This is merely a heuristic, a good enough indicator of transitive dependencies
  // changing - and rerendering being necessary as a result.
  // Through requireAsync, and module could add additional dependencies after
  // this mdx module is rendered. Changes to such dependencies will go unnoticed.
  const transitiveDependencies: Set<string> = await getTransitiveMDXModuleDependencies(definingTiddlerTitle, loader)
  parentWidget.addChangedTiddlerHook(
    (changedTiddlers: $tw.ChangedTiddlers): boolean => Object.keys(changedTiddlers).some(
      (title) => transitiveDependencies.has(title)));
};

export const MDXFactory = async ({
  parentWidget,
  children,
  mdx,
  title,
  loader = mdxModuleLoader,
}: MDXFactoryProps) => {
  let definingTiddlerTitle = title;
  if (definingTiddlerTitle === PARSER_TITLE_PLACEHOLDER) {
    if (!parentWidget) {
      throw new Error(
        "Needs to get title from parent widget, but no parentWidget prop set"
      );
    }
    definingTiddlerTitle = parentWidget.getVariable("currentTiddler");
  }
  if (children) {
    console.warn("MDX widget ignoring children", children);
  }

  // If the currently rendered tiddler has a valid title, the contents of the
  // mdx argument (if specified) are ignored, and the content of the tiddler
  // is read from the wiki. Otherwise, the mdx field is used.
  let compilationResult: CompilationResult | undefined = undefined;
  if (definingTiddlerTitle) {
    // load the module if not yet loaded
    await loader.loadModule({
      tiddler: definingTiddlerTitle,
      context: makeMDXContext(definingTiddlerTitle),
    });
    // getCompilationResult is guaranteed to return an actual value due to the
    // previous loadModule() call.
    compilationResult = await loader.getCompilationResult(definingTiddlerTitle);
    // add a callback for ReactWrapper to check if rerendering is necessary
    // due to changes in dependencies
    if (parentWidget) {
      await addTiddlerChangeHook(
        parentWidget as ReactWrapper,
        definingTiddlerTitle,
        loader
      );
    }
  } else {
    compilationResult = await loader.evaluateMDX({
      mdx,
      context: makeMDXContext(undefined),
    });
  }

  return (props: any) => {
    try {
      if (!compilationResult) {
        throw new Error("Internal error: compilationResult should not be falsy!");
      }
      const warnings = ("warnings" in compilationResult) ? compilationResult["warnings"] : [];
      let body: ReactNode = undefined;
      if (compilationResult) {
        if ("moduleExports" in compilationResult) {
          body = compilationResult?.moduleExports?.default({
            ...props,
            components: getBuiltinComponents(),
          });
        } else {
          body = (compilationResult.error instanceof Error) ? reportRuntimeError(compilationResult.error, compilationResult.errorTitle) : reportCompileError(
            compilationResult.error,
            compilationResult.loadContext.mdx,
            compilationResult.errorTitle
          );
        }
      }

      return [...warnings.map((details) => MDXError({ mdx, details })), body];
    } catch (e) {
      return reportRuntimeError(e as Error, "Error rendering default MDX component");
    }
  };
};
