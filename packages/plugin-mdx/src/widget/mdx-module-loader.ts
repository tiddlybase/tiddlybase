
import type { } from "@tiddlybase/tw5-types/src/index";

import {
  CompilationResult,
  compile,
  getExports,
} from "@tiddlybase/plugin-mdx/src/mdx-client/mdx-client";
import { MDXErrorDetails } from "../mdx-client/mdx-error-details";

export interface ModuleLoaderContext {
  // stack of module names requiring each other leading to current module
  requireStack: string[];
  // direct requirements of currently loaded module (popuplated as imports are executed during load).
  requiredModules: Set<string>;
  // module-type (eg: MDX) specific context necessary for compiling
  // required modules module exports not already available.
  mdxContext: MDXContext,
  onRequire?: OnRequire,
  // TiddlyWiki standard objects, which default to global $tw.{wiki, modules}.
  wiki: $tw.Wiki,
  modules: $tw.TW5Modules,
}

export type ModuleLoadError = {
  error: MDXErrorDetails | Error;
  errorTitle: string;
  loadContext: ModuleLoaderContext
};

export type CompileAndDefineOuput =
  | ModuleLoadError
  | { warnings: Array<MDXErrorDetails>; compiledFn: any; moduleExports: $tw.ModuleExports; definedModule?: boolean};

export type GetModuleOutput =
  | { moduleExports: $tw.ModuleExports }
  | CompileAndDefineOuput;

export type MDXContext = Record<string, any> & {
  definingTiddlerTitle: string | undefined;
  components: Record<string, any>;
}

type OnRequire = (moduleName: string) => void;

export class RequireAsyncError extends Error {
  props: ModuleLoadError;
  constructor(props:ModuleLoadError) {
    super(props.errorTitle);
    this.props = props;
  }
}

const MD_MIME_TYPE = "text/x-markdown";

let anonymousGeneratedFunctionCounter = 0;

const getContextKeys = (mdxContext: MDXContext): string[] =>
  Object.keys(mdxContext).sort();

const getContextValues = (mdxContext: MDXContext): any[] =>
  getContextKeys(mdxContext).reduce((acc, key) => {
    acc.push((mdxContext)[key]);
    return acc;
  }, [] as any[]);

export const getRequireAsync = (
    loadContext: ModuleLoaderContext,
  ) =>
    async (requiredModuleName: string) => {
      if (loadContext.onRequire) {
        loadContext.onRequire(requiredModuleName);
      }

      const maybeExports = await getModuleExports({
        loadContext,
        tiddler: requiredModuleName,
      });

      if ("error" in maybeExports) {
        throw new RequireAsyncError({
          error: maybeExports.error,
          errorTitle: maybeExports.errorTitle,
          loadContext: maybeExports.loadContext
        });
      }
      loadContext.requiredModules.add(requiredModuleName);
      return maybeExports.moduleExports;
    };

const compileMDX = async (
  tiddler: string | undefined,
  mdx: string,
  mdxContext: MDXContext
): Promise<CompilationResult> => {
  let fnName = tiddler;
  if (!fnName) {
    fnName = `mdx_generated_${anonymousGeneratedFunctionCounter++}`;
  }
  try {
    // TODO: getting the context keys should be generic, but
    // assuming T === MDXContext for now
    return await compile(fnName, mdx, getContextKeys(mdxContext));
  } catch (e) {
    return { error: e as Error };
  }
};

const defineModule = (
  tiddler: string,
  exports: $tw.ModuleExports,
  requiredModules: Set<string>,
  modules: $tw.TW5Modules
) => {
  modules.define(tiddler, "library", exports);
  modules.titles[tiddler].requires = requiredModules;
};

const compileExecuteDefine = async ({
  loadContext,
  mdx,
  tiddler,
}: {
  loadContext: ModuleLoaderContext,
  mdx: string;
  tiddler?: string;
  requiredModules?: Set<string>;
}): Promise<CompileAndDefineOuput> => {
  const requireAsync = getRequireAsync(
    loadContext,
  );
  const mdxContext = { ...loadContext.mdxContext };
  const compilationResult = await compileMDX(
    tiddler,
    mdx,
    mdxContext
  );
  if ("error" in compilationResult) {
    return {
      error: compilationResult.error,
      errorTitle: "Error compiling MDX source",
      loadContext
    };
  }
  try {
    // evaluate compiled javascript
    const { default: jsxCompiledDefault, ...moduleExports } = await getExports(
      compilationResult.compiledFn,
      requireAsync,
      getContextValues(mdxContext)
    );

    // make default() receive the components prop by default if
    // 'components' exists in the context to pass in overridden
    // and implicitly available react components.
    if ('components' in mdxContext) {
      moduleExports.default = (props: any) =>
        jsxCompiledDefault({
          ...props,
          components: {...(props?.components ?? {}), ...(mdxContext.components)},
        });
    } else {
      moduleExports.default = jsxCompiledDefault;
    }
    // define module if tiddler title is available
    if (tiddler) {
      defineModule(
        tiddler,
        moduleExports,
        loadContext.requiredModules,
        loadContext.modules
      );
    }
    return {
      ...compilationResult,
      definedModule: !!tiddler,
      moduleExports,
    };
  } catch (e) {
    if (e instanceof RequireAsyncError) {
      return e.props;
    }
    return { error: e as Error, errorTitle: "Error executing compiled MDX", loadContext };
  }
};


// To require() a module, it must have been registered with TiddlyWiki
// either at boot time (js modules) or because MDX has already compiled and
// registered the generated module with TiddlyWiki. For MDX dependencies,
// compile them now so they can be required if necessary

export const getModuleExports = async ({
  loadContext: prevLoadContext,
  tiddler,
}: {
  loadContext: ModuleLoaderContext;
  tiddler: string;
}): Promise<GetModuleOutput> => {

  // There are 3 possible scenarios:
  // 1. The module has already been execute()-ed and $tw.modules.title[$TITLE].exports exists.
  // 2. The module has been defined ($tw.modules.title[$TITLE] exists) *is regular JS*, but has not been run yet and thus it's exports aren't available yet.
  // 3. The module has been defined ($tw.modules.title[$TITLE] exists) *is MDX*, but has not been run yet and thus it's exports aren't available yet.
  // 4. The module has not been defined. For MDX modules, we can do that here.
  const requestedModule: $tw.TW5Module | undefined =
    prevLoadContext.modules.titles[tiddler];
  // Case 1 or 2: module exports already exist
  if (requestedModule?.exports) {
    return { moduleExports: requestedModule.exports };
  }

  // Cases 2-4: module needs execution
  // The module has not been evaluated yet, it must be executed now.
  // created a new loadContext with an empty requiredModules set.
  // Theoretically, the context could be anything (generic type T), but
  // in practice, it's an MDXContext, which happens to have a 'definingTiddlerTitle'
  // which needs to be updated.
  const loadContext = makeModuleLoaderContext({
    tiddler,
    mdxContext: {...prevLoadContext.mdxContext, definingTiddlerTitle: tiddler},
    prevLoadContext
  })
  loadContext.requireStack.push(tiddler);

  // Prevent circular dependencies
  if (prevLoadContext.requireStack.includes(tiddler)) {
    return {
      error: new Error(`Importing '${tiddler}' causes circular dependencies. Full chain: ${loadContext.requireStack.join('→')}`),
      errorTitle: "Circular dependency detected",
      loadContext
    };
  }

  // How we proceed depends on whether or not module is MDX.
  // modules.execute() isn't MDX specific or async aware. It will just do
  // moduleInfo.exports = moduleInfo.definition if moduleInfo.definition is an object.
  // So we avoid calling it and set the module exports after getting exports ourselves for MDX.

  const tiddlerObj = loadContext.wiki.getTiddler(tiddler);
  if (!tiddlerObj) {
    return {
      error: new Error(`Tiddler '${tiddler}' not found in wiki.`),
      errorTitle: "Tiddler not found",
      loadContext
    };
  }
  const tiddlerType = tiddlerObj?.fields?.type;

  // Case 2: non-MDX tiddler for which exports must be computed.
  if (requestedModule && tiddlerType !== MD_MIME_TYPE) {
    try {
      return {
        moduleExports: loadContext.modules.execute(tiddler, prevLoadContext.requireStack.slice(-1)[0]),
      };
    } catch (e) {
      return {
        error: e as Error,
        errorTitle: `Error executing module ${tiddler}`,
        loadContext
      };
    }
  }

  // Case 3 & 4: module is an MDX module which needs to be compiled
  // It doesn't matter if it has already been defined previously or not.
  if (tiddlerObj.fields.type !== MD_MIME_TYPE) {
    return {
      error: new Error(
        `Tiddler '${tiddler}' has type ${tiddlerObj.fields.type}; MDX tiddlers must have type ${MD_MIME_TYPE}`
      ),
      errorTitle: "Wrong MIME type",
      loadContext
    };
  }
  const mdx = tiddlerObj.fields.text ?? "";
  // compile and evaluate, and define MDX module
  return await compileExecuteDefine({
    loadContext,
    tiddler,
    mdx,
  });
};

export const makeModuleLoaderContext = ({
  mdxContext: _mdxContext,
  tiddler,
  prevLoadContext,
  wiki : _wiki,
  modules : _modules,
}: {
  mdxContext?: MDXContext,
  tiddler?: string,
  prevLoadContext?: ModuleLoaderContext,
  wiki?: $tw.Wiki,
  modules?: $tw.TW5Modules,
}) => {
  const requireStack = (prevLoadContext?.requireStack ?? []).slice();
  const mdxContext = _mdxContext ?? prevLoadContext?.mdxContext
  if (mdxContext === undefined) {
    throw new Error("mdxContext cannot be undefined");
  }
  const wiki = _wiki ?? prevLoadContext?.wiki ?? global?.$tw?.wiki;
  const modules = _modules ?? prevLoadContext?.modules ?? global?.$tw?.modules;
  if (!wiki || !modules) {
    throw new Error("wiki or modules cannot be undefined");
  }
  return {
    requireStack,
    requiredModules: new Set<string>([]),
    mdxContext,
    wiki,
    modules,
  };
};

export const loadMDXModule = async ({
  mdx, tiddler, context, loadContext: _loadContext
}: {
  mdx?: string,
  tiddler?: string,
  context?: MDXContext,
  // mostly needed to pass in mock out $tw objects
  loadContext?: ModuleLoaderContext
}) => {
  const loadContext: ModuleLoaderContext = _loadContext ?? makeModuleLoaderContext({
    mdxContext: context ?? {
      definingTiddlerTitle: tiddler,
      components: {}
    },
    tiddler
  });
  // If the currently rendered tiddler has a valid title, the contents of the
  // mdx argument (if specified) are ignored, and the content of the tiddler
  // is read from the wiki. Otherwise, the mdx field is used.
  if (tiddler) {
    return await getModuleExports({
      loadContext,
      tiddler,
    })
  } else if (mdx) {
    return await compileExecuteDefine({
      loadContext,
      tiddler,
      mdx,
    });
  }
  throw new Error("mdx or tiddler must be set!");
}
