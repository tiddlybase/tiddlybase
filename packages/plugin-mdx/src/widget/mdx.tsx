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
import { getModuleDependencies } from "./module-utils";

export type MDXFactoryProps = WrappedPropsBase & {
  mdx: string;
  title?: string;
  loader?: MDXModuleLoader;
};

export type MDXMetadata = {
  dependencies: string[];
};

export const PARSER_TITLE_PLACEHOLDER = "__parser_didnt_know__";

const customComponents: Record<string, React.FunctionComponent> = {};

export const registerComponent = (
  name: string,
  component: React.FunctionComponent
) => {
  customComponents[name] = component;
};

const getBuiltinComponents = () => ({ ...baseComponents, ...customComponents });

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

export const reportCompileError = (error: MDXErrorDetails, mdx?: string, title?: string) => MDXError({ title, mdx, details: error, fatal: true });

// TODO
export const reportRuntimeError = (error: Error, title?: string) => JSError({title, error});

export const mdxModuleLoader: MDXModuleLoader = new MDXModuleLoader();

const makeMDXContext = (
  definingTiddlerTitle?: string,
) => {
  const components = getBuiltinComponents();
  const mdxContext = {
    definingTiddlerTitle,
    components,
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
            return reportRuntimeError(e as Error, "Error in dynamic component passed to render().");
          }
        }),
        {} // no props passed
      );
    },
  };
  return mdxContext;
};

const addTiddlerChangeHook = (
  parentWidget: ReactWrapper,
  definingTiddlerTitle: string,
  getDependencies: () => Set<string>
) => {
  // this function is run once when the MDX widget is rendered, so
  // there's no need to remove the hook registered by addChangedTiddlerHook
  parentWidget.addChangedTiddlerHook(
    (changedTiddlers: $tw.ChangedTiddlers): boolean => {
      console.log(`ChangedTiddlerHook ${definingTiddlerTitle}`);
      const dependencies = getDependencies();
      const changeDetected = Object.keys(changedTiddlers).some((title) =>
        dependencies.has(title)
      );
      return changeDetected;
    }
  );
};

/**
 * CustomComponentProps is the inteface presented to
 */
export type CustomComponentProps = ReturnType<typeof getCustomComponentProps>;

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
    console.log("MDX ignoring children", children);
  }
  // stores transitive dependencies
  let dependencyCache: Set<string> | undefined;
  const onRequire = (moduleName: string) => {
    // a new requireAsync() call was made, so invalidate dependency cache
    dependencyCache = undefined;
  };
  // If the currently rendered tiddler has a valid title, the contents of the
  // mdx argument (if specified) are ignored, and the content of the tiddler
  // is read from the wiki. Otherwise, the mdx field is used.
  let compilationResult: CompilationResult | undefined = undefined;
  if (definingTiddlerTitle) {
    // load the module if not yet loaded
    await loader.loadModule({
      tiddler: definingTiddlerTitle,
      context: makeMDXContext(definingTiddlerTitle),
      onRequire,
    });
    // getCompilationResult is guaranteed to return an actual value due to the
    // previous loadModule() call.
    compilationResult = await loader.getCompilationResult(definingTiddlerTitle);
  } else {
    compilationResult = await loader.evaluateMDX({
      mdx,
      context: makeMDXContext(undefined),
      onRequire,
    });
  }

  if (parentWidget && definingTiddlerTitle) {
    addTiddlerChangeHook(
      parentWidget as ReactWrapper,
      definingTiddlerTitle,
      () => {
        if (dependencyCache === undefined) {
          console.log("calculateAllDependencies", definingTiddlerTitle);
          dependencyCache = getModuleDependencies(
            $tw.modules,
            definingTiddlerTitle!
          );
        }
        return dependencyCache;
      }
    );
  }

  return (props: any) => {
    try {
      console.log("RENDERING", definingTiddlerTitle);
      if (!compilationResult) {
        throw new Error("comilationResult should not be falsy!");
      }
      const warnings = ("warnings" in compilationResult) ? compilationResult["warnings"] : [];
      let body:ReactNode = undefined;
      if (compilationResult) {
        if ("moduleExports" in compilationResult) {
          body = compilationResult?.moduleExports?.default({
            ...props,
            components: getBuiltinComponents(),
          });
        } else {
          body = (compilationResult.error instanceof Error) ? reportRuntimeError(compilationResult.error, compilationResult.errorTitle): reportCompileError(
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
