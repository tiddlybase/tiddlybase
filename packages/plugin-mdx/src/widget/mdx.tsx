import type {} from "@tiddlybase/tw5-types/src/index";

import {
  CompilationResult,
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
import { getModuleDependencies } from "./module-utils";

export type MDXFactoryProps = WrappedPropsBase & {
  mdx: string;
  title: string;
  // for testing only;
  modules?: $tw.TW5Modules;
  wiki: $tw.Wiki;
};

export type MDXMetadata = {
  dependencies: string[];
};

const MD_MIME_TYPE = "text/x-markdown";

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

export const getRequireAsync =
  (
    definingTiddlerTitle: string,
    requiredModules: Set<string>,
    wiki: $tw.Wiki,
    modules: $tw.TW5Modules,
    onRequire?: OnRequire
  ) =>
  async (requiredModuleName: string) => {
    if (onRequire) {
      onRequire(requiredModuleName);
    }
    // This is a little tricky:
    // we don't pass requiredModules since each module just keeps track
    // of immediate require()s, not transitive dependencies.
    // We do pass onRequire, since it's likely that a transitive dependency
    // changes our dep tree, in which case we want onRequire to fire.
    const maybeExports = await getModuleExports({
      definingTiddlerTitle: requiredModuleName,
      moduleRoot: definingTiddlerTitle,
      wiki,
      modules,
      onRequire
    });

    if ("error" in maybeExports) {
      throw maybeExports.error;
    }
    requiredModules.add(requiredModuleName);
    return maybeExports.moduleExports;
  };

export const makeErrorReporter =
  (mdx: string) => (e: Error | MDXErrorDetails, title?: string) => () =>
    isMDXErrorDetails(e)
      ? MDXError({ title, mdx, details: e, fatal: true })
      : JSError({ title, error: e });

type ErrorReporter = ReturnType<typeof makeErrorReporter>;

const makeMDXContext = (
  definingTiddlerTitle: string,
  reportError: ErrorReporter,
  components: Record<string, any> = {},
  context:Record<string, any> = {}
) => {
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
            return reportError(
              e as Error | MDXErrorDetails,
              "Error rendering component passed to render() helper function"
            )();
          }
        }),
        {} // no props passed
      );
    },
    ...context
  };
  return mdxContext;
};

const getContextKeys = (mdxContext: Record<string, any>): string[] =>
  Object.keys(mdxContext).sort();

const getContextValues = (mdxContext: Record<string, any>): any[] =>
  getContextKeys(mdxContext).reduce((acc, key) => {
    acc.push((mdxContext as any)[key]);
    return acc;
  }, [] as any[]);

const compileMDX = async (
  definingTiddlerTitle: string,
  mdx: string,
  mdxContext: Record<string, any>
): Promise<CompilationResult> => {
  try {
    return await compile(definingTiddlerTitle, mdx, getContextKeys(mdxContext));
  } catch (e) {
    return { error: e as Error };
  }
};

type OnRequire = (moduleName:string)=>void;

export type GetModuleOutput = { moduleExports: $tw.ModuleExports } | CompileAndDefineOuput;

// To require() a module, it must have been registered with TiddlyWiki
// either at boot time (js modules) or because MDX has already compiled and
// registered the generated module with TiddlyWiki. For MDX dependencies,
// compile them now so they can be required if necessary

export const getModuleExports = async ({
  definingTiddlerTitle,
  moduleRoot,
  requiredModules = new Set<string>([]),
  wiki,
  modules,
  onRequire
}: {
  definingTiddlerTitle: string;
  moduleRoot?: string;
  requiredModules?: Set<string>;
  wiki: $tw.Wiki;
  modules: $tw.TW5Modules;
  onRequire?: OnRequire;
}): Promise<GetModuleOutput> => {
  // There are 3 possible scenarios:
  // 1. The module has already been execute()-ed and $tw.modules.title[$TITLE].exports exists.
  // 2. The module has been defined ($tw.modules.title[$TITLE] exists) *is regular JS*, but has not been run yet and thus it's exports aren't available yet.
  // 3. The module has been defined ($tw.modules.title[$TITLE] exists) *is MDX*, but has not been run yet and thus it's exports aren't available yet.
  // 4. The module has not been defined. For MDX modules, we can do that here.
  console.log(`REQUIRE getModuleExports('${definingTiddlerTitle}') called by ${moduleRoot}`);
  const requestedModule: $tw.TW5Module | undefined =
    modules.titles[definingTiddlerTitle];
  // Case 1 or 2: module exports already exist
  if (requestedModule?.exports) {
    return { moduleExports: requestedModule.exports };
  }

  // Cases 2-4: module needs execution
  // How we proceed depends on whether or not module is MDX.
  // modules.execute() isn't MDX specific or async aware. It will just do
  // moduleInfo.exports = moduleInfo.definition if moduleInfo.definition is an object.
  // So we avoid calling it and set the module exports after getting exports ourselves for MDX.


  const tiddlerType = wiki.getTiddler(definingTiddlerTitle)?.fields?.type;

  // Case 2: non-MDX tiddler for which exports must be computed.
  if (requestedModule && tiddlerType !== MD_MIME_TYPE) {
    try {
      return { moduleExports: modules.execute(definingTiddlerTitle, moduleRoot) };
    } catch (e) {
      return {
        error: e as Error,
        errorTitle: `Error executing module ${definingTiddlerTitle}`,
      };
    }
  }



  // Case 3 & 4: module is an MDX module which needs to be compiled
  // It doesn't matter if it has already been defined previously or not.
  const tiddler = wiki.getTiddler(definingTiddlerTitle);
  if (!tiddler) {
    return {
      error: new Error(`Tiddler '${definingTiddlerTitle}' not found in wiki.`),
      errorTitle: "Tiddler not found",
    };
  }
  if (tiddler.fields.type !== MD_MIME_TYPE) {
    return {
      error: new Error(
        `Tiddler '${definingTiddlerTitle}' has type ${tiddler.fields.type}; MDX tiddlers must have type ${MD_MIME_TYPE}`
      ),
      errorTitle: "Wrong MIME type",
    };
  }
  const mdx = tiddler.fields.text ?? "";
  // compile and evaluate, and define MDX module
  return await compileExecuteDefine(
    definingTiddlerTitle,
    mdx,
    requiredModules,
    wiki,
    modules,
    onRequire
  );
};

const defineModule = (
  definingTiddlerTitle: string,
  exports: any,
  requiredModules: Set<string>,
  modules: $tw.TW5Modules
) => {
  console.log(`DEFINE ${definingTiddlerTitle}`);
  modules.define(definingTiddlerTitle, "library", exports);
  modules.titles[definingTiddlerTitle].requires = requiredModules;
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
      const changeDetected = Object.keys(changedTiddlers).some((title) => dependencies.has(title));
      return changeDetected;
    }
  );
};

export type CompileAndDefineOuput =
  | { error: MDXErrorDetails | Error; errorTitle: string }
  | { warnings: Array<MDXErrorDetails>; compiledFn: any; moduleExports?: any };

const compileExecuteDefine = async (
  definingTiddlerTitle: string,
  mdx: string,
  requiredModules: Set<string>,
  wiki: $tw.Wiki = $tw.wiki,
  modules: $tw.TW5Modules = $tw.modules,
  onRequire?: OnRequire
): Promise<CompileAndDefineOuput> => {
  const reportError = makeErrorReporter(mdx);
  const components = getBuiltinComponents();
  const requireAsync = getRequireAsync(
    definingTiddlerTitle,
    requiredModules,
    wiki,
    modules,
    onRequire
  );
  const mdxContext = makeMDXContext(
    definingTiddlerTitle,
    reportError,
    components,
    {
      React,
      withContext,
      wiki,
      requireAsync
    }
  );
  const compilationResult = await compileMDX(
    definingTiddlerTitle,
    mdx,
    mdxContext
  );
  if ("error" in compilationResult) {
    return {
      error: compilationResult.error,
      errorTitle: "Error compiling MDX source",
    };
  }
  let moduleExports: $tw.ModuleExports;
  try {
    // evaluate compiled javascript
    moduleExports = await getExports(
      compilationResult.compiledFn,
      requireAsync,
      getContextValues(mdxContext)
    );
  } catch (e) {
    return { error: e as Error, errorTitle: "Error executing compiled MDX" };
  }
  defineModule(definingTiddlerTitle, moduleExports, requiredModules, modules);
  return {
    ...compilationResult,
    moduleExports,
  };
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
  const reportError = makeErrorReporter(mdx);
  // stores transitive dependencies
  let dependencyCache:Set<string>|undefined;
  const maybeModuleExports = await getModuleExports({
    definingTiddlerTitle,
    wiki: $tw.wiki,
    modules: $tw.modules,
    onRequire: (moduleName:string) => {
      // a new requireAsync() call was made, so invalidate dependency cache
      dependencyCache = undefined;
    }
  });
  if ("error" in maybeModuleExports) {
    return reportError(maybeModuleExports.error, maybeModuleExports.errorTitle);
  }
  if (parentWidget) {
    addTiddlerChangeHook(
      parentWidget as ReactWrapper,
      definingTiddlerTitle,
      () => {
        if (dependencyCache === undefined) {
          console.log("calculateAllDependencies", definingTiddlerTitle);
          dependencyCache = getModuleDependencies($tw.modules, definingTiddlerTitle);
        }
        return dependencyCache;
      }
    );
  }

  return (props: any) => {
    try {
      console.log("RENDERING", definingTiddlerTitle);
      return [
        ...// this strange way of getting 'warnings' keeps tsc happy
        ("warnings" in maybeModuleExports
          ? maybeModuleExports["warnings"]
          : []
        ).map((details) => MDXError({ mdx, details })),
        maybeModuleExports.moduleExports.default({
          ...props,
          components: getBuiltinComponents(),
        }),
      ];
    } catch (e) {
      return JSError({
        title: "Error rendering default MDX component",
        error: e as Error,
      });
    }
  };
};
