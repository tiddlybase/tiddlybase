
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
  onRequire?: OnRequire;
}

export type ModuleLoadError = {
  error: MDXErrorDetails | Error;
  errorTitle: string;
  loadContext: ModuleLoaderContext
};

export type CompileAndDefineOuput =
  | ModuleLoadError
  | { warnings: Array<MDXErrorDetails>; compiledFn: any; moduleExports: $tw.ModuleExports; definedModule?: boolean };

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
  constructor(props: ModuleLoadError) {
    super(props.errorTitle);
    this.props = props;
  }
}

const MD_MIME_TYPE = "text/x-markdown";

const getContextKeys = (mdxContext: MDXContext): string[] =>
  Object.keys(mdxContext).sort();

const getContextValues = (mdxContext: MDXContext): any[] =>
  getContextKeys(mdxContext).reduce((acc, key) => {
    acc.push((mdxContext)[key]);
    return acc;
  }, [] as any[]);

export class MDXModuleLoader {
  anonymousGeneratedFunctionCounter = 0;
  // TiddlyWiki standard objects, which default to global $tw.{wiki, modules}.
  wiki: $tw.Wiki;
  modules: $tw.TW5Modules;

  constructor({
    wiki = globalThis.$tw.wiki,
    modules = globalThis.$tw.modules,
  }: {
    wiki?: $tw.Wiki,
    modules?: $tw.TW5Modules,
  }) {
    this.wiki = wiki;
    this.modules = modules;
  }

  private getRequireAsync(
    loadContext: ModuleLoaderContext,
  ) {
    return async (requiredModuleName: string) => {
      if (loadContext.onRequire) {
        loadContext.onRequire(requiredModuleName);
      }

      const maybeExports = await this.getModuleExports({
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
  }

  private async compileMDX(
    tiddler: string | undefined,
    mdx: string,
    mdxContext: MDXContext
  ): Promise<CompilationResult> {
    let fnName = tiddler;
    if (!fnName) {
      fnName = `mdx_generated_${this.anonymousGeneratedFunctionCounter++}`;
    }
    try {
      // TODO: getting the context keys should be generic, but
      // assuming T === MDXContext for now
      return await compile(fnName, mdx, getContextKeys(mdxContext));
    } catch (e) {
      return { error: e as Error };
    }
  };

  private defineModule(
    tiddler: string,
    exports: $tw.ModuleExports,
    requiredModules: Set<string>,
  ): void {
    this.modules.define(tiddler, "library", exports);
    this.modules.titles[tiddler].requires = requiredModules;
  };

  private async compileExecuteDefine({
    loadContext,
    mdx,
    tiddler,
  }: {
    loadContext: ModuleLoaderContext,
    mdx: string;
    tiddler?: string;
    requiredModules?: Set<string>;
  }): Promise<CompileAndDefineOuput> {
    // To require() a module, it must have been registered with TiddlyWiki
    // either at boot time (js modules) or because MDX has already compiled and
    // registered the generated module with TiddlyWiki. For MDX dependencies,
    // compile them now so they can be required if necessary

    const requireAsync = this.getRequireAsync(
      loadContext,
    );
    const mdxContext = { ...loadContext.mdxContext };
    const compilationResult = await this.compileMDX(
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
            components: { ...(props?.components ?? {}), ...(mdxContext.components) },
          });
      } else {
        moduleExports.default = jsxCompiledDefault;
      }
      // define module if tiddler title is available
      if (tiddler) {
        this.defineModule(
          tiddler,
          moduleExports,
          loadContext.requiredModules
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





  private async getModuleExports({
    loadContext: prevLoadContext,
    tiddler,
  }: {
    loadContext: ModuleLoaderContext;
    tiddler: string;
  }): Promise<GetModuleOutput> {

    // There are 3 possible scenarios:
    // 1. The module has already been execute()-ed and $tw.modules.title[$TITLE].exports exists.
    // 2. The module has been defined ($tw.modules.title[$TITLE] exists) *is regular JS*, but has not been run yet and thus it's exports aren't available yet.
    // 3. The module has been defined ($tw.modules.title[$TITLE] exists) *is MDX*, but has not been run yet and thus it's exports aren't available yet.
    // 4. The module has not been defined. For MDX modules, we can do that here.
    const requestedModule: $tw.TW5Module | undefined =
      this.modules.titles[tiddler];
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
    const loadContext = this.makeModuleLoaderContext(prevLoadContext, tiddler);

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

    const tiddlerObj = this.wiki.getTiddler(tiddler);
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
          moduleExports: this.modules.execute(tiddler, prevLoadContext.requireStack.slice(-1)[0]),
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
    return await this.compileExecuteDefine({
      loadContext,
      tiddler,
      mdx,
    });
  };

  private makeModuleLoaderContext(prevLoadContext: ModuleLoaderContext, tiddler?: string): ModuleLoaderContext {
    const ctxt: ModuleLoaderContext = {
      requireStack: prevLoadContext.requireStack.slice(),
      mdxContext: { ...prevLoadContext.mdxContext },
      requiredModules: new Set<string>([]),
      onRequire: prevLoadContext.onRequire
    };
    if (tiddler) {
      ctxt.mdxContext.definingTiddlerTitle = tiddler;
      ctxt.requireStack.push(tiddler);
    }
    return ctxt
  };

  async loadModule({
    context, mdx, tiddler, onRequire
  }: {
    context?: MDXContext,
    mdx?: string,
    tiddler?: string,
    onRequire?: OnRequire
  }) {
    const loadContext: ModuleLoaderContext = this.makeModuleLoaderContext({
      requireStack: [],
      requiredModules: new Set<string>([]),
      mdxContext: context ?? {
        definingTiddlerTitle: undefined,
        components: {}
      }
    });
    // If the currently rendered tiddler has a valid title, the contents of the
    // mdx argument (if specified) are ignored, and the content of the tiddler
    // is read from the wiki. Otherwise, the mdx field is used.
    if (tiddler) {
      return await this.getModuleExports({
        loadContext,
        tiddler,
      })
    } else if (mdx) {
      return await this.compileExecuteDefine({
        loadContext,
        tiddler,
        mdx,
      });
    }
    throw new Error("mdx or tiddler must be set!");
  }

} // end class MDXModuleLoader
