import type { } from "@tiddlybase/tw5-types/src/index";

import {
  TW5ReactContextType,
  withContext
} from "@tiddlybase/plugin-react/src/components/TW5ReactContext";
import type {
  ReactWrapper, WrappedPropsBase
} from "@tiddlybase/plugin-react/src/react-wrapper";
import React from "react";
import * as ReactJSXRuntime from "react/jsx-runtime";
import { components as baseComponents } from "./components";
import { mdxModuleLoader } from "./global";
import { CompilationResult, MDXModuleLoader, ModuleSet } from "./mdx-module-loader";
import { compiledMDXToReactComponent, reportRuntimeError } from "./mdx-util";
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
  const transitiveDependencies: ModuleSet = await getTransitiveMDXModuleDependencies(definingTiddlerTitle, loader)
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

  if (!compilationResult) {
    throw new Error("Internal error: compilationResult should not be falsy!");
  }

  return compiledMDXToReactComponent(compilationResult);
};
