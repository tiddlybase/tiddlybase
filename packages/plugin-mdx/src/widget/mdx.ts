import type { } from "@tiddlybase/tw5-types/src/index";

import type {
  ReactWrapper, WrappedPropsBase
} from "@tiddlybase/plugin-react/src/react-wrapper";
import React from "react";
import { components as baseComponents } from "./components";
import { mdxModuleLoader } from "./global";
import { CompilationResult, makeAbsPath, MDXContext, MDXModuleLoader, ModuleSet } from "./mdx-module-loader";
import { wrapMDXComponent } from "./mdx-util";

const MIME_TYPE = "text/x-markdown";

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

const makeMDXContext = (
  loader: MDXModuleLoader,
  definingTiddlerTitle?: string,
): MDXContext => ({
  definingTiddlerTitle,
  components: getBuiltinComponents(),
  tiddlybase: loader.mdxTiddlybaseAPI,
  absPath: makeAbsPath(definingTiddlerTitle)
});

const addTiddlerChangeHook = async (
  parentWidget: ReactWrapper,
  definingTiddlerTitle: string,
  loader: MDXModuleLoader
) => {
  // This is merely a heuristic, a good enough indicator of transitive dependencies
  // changing - and rerendering being necessary as a result.
  // Through requireAsync, any module could add additional dependencies after
  // this mdx module is rendered. Changes to such dependencies will go unnoticed.
  const transitiveDependencies: ModuleSet = await loader.getTransitiveDependencies(definingTiddlerTitle)
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
      // the tiddler title is a placeholder, but the real value could not
      // be read from parentWidget, so unsetting it
      definingTiddlerTitle = undefined;
    }
    else if (mdx) {
      // Due to transclusion (eg: in the Import popup when clicking the chevron next to an imported item),
      // it's possible that the tiddler title will be a non-MDX tiddler's title, in the above example $:/Import.
      // In such a case, MDXFactory should try to compile to mdx as passed in the prop, not what is read from
      // the wiki.
      // NOTE: In the Import case, transclusion is a problem because the MDX is within a subtiddler.
      // this could be loaded from the wiki with, eg: $tw.wiki.getSubTiddler("$:/Import", "PHOTO-2023-04-23-18-29-59.jpg")
      // parentWidget.transcludeSubTiddler and parentWidget.transcludeTitle contain these values.
      // Since the MDX is passed as a prop directly, not implementing special subtiddler transclusion support for now.
      const titleCandidate = parentWidget.getVariable("currentTiddler");
      if (titleCandidate && loader.wiki.getTiddler(titleCandidate)?.fields.type === MIME_TYPE) {
        // compile mdx from tiddler text field
        definingTiddlerTitle = titleCandidate
      } else {
        // compile mdx from prop, don't read any tiddlers' text fields.
        definingTiddlerTitle = undefined;
      }
    }
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
      context: makeMDXContext(loader, definingTiddlerTitle),
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
    if (!mdx) {
      throw Error("Setting the 'title' prop is mandatory if the 'mdx' is not set");
    }
    compilationResult = await loader.evaluateMDX({
      mdx,
      context: makeMDXContext(loader, undefined),
    });
  }

  if (!compilationResult) {
    throw new Error("Internal MDX error: compilationResult should not be falsy!");
  }

  return wrapMDXComponent(compilationResult);
};
