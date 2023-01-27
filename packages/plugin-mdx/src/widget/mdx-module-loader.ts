
import type { } from "@tiddlybase/tw5-types/src/index";

import {
  CompilationResult as MDXCompilationResult,
  compile,
  getExports,
} from "@tiddlybase/plugin-mdx/src/mdx-client/mdx-client";
import { MDXErrorDetails } from "../mdx-client/mdx-error-details";

export type ModuleSet = Set<string>;

export interface ModuleLoaderContext {
  // stack of module names requiring each other leading to current module
  requireStack: string[];
  // direct requirements of currently loaded module (popuplated as imports are executed during load).
  dependencies: ModuleSet;
  // module-type (eg: MDX) specific context necessary for compiling
  // required modules module exports not already available.
  mdxContext: MDXContext;
}

export type ModuleLoadError = {
  error: MDXErrorDetails | Error;
  errorTitle: string;
  loadContext: ModuleLoaderContext
};

export type CompilationResult = { mdx?: string } & (
  ModuleLoadError
  | { warnings: Array<MDXErrorDetails>; compiledFn: any; moduleExports: $tw.ModuleExports; dependencies: ModuleSet; });

export type ModuleExportsResult =
  | ModuleLoadError
  | { moduleExports: $tw.ModuleExports }

type RequireAsync = (requiredModuleName: string) => Promise<$tw.ModuleExports>;

export type MDXContext = Record<string, any> & {
  definingTiddlerTitle: string | undefined;
  components: Record<string, any>;
  requireAsync?: RequireAsync;
}

export class RequireAsyncError extends Error {
  props: ModuleLoadError;
  constructor(props: ModuleLoadError) {
    super(props.errorTitle);
    this.props = props;
  }
}

const MD_MIME_TYPE = "text/x-markdown";

const MODULE_DROP_EXPORT_NAME = "__drop__";

const compilationResultToModuleExports = (compilationResult: CompilationResult): ModuleExportsResult => {
  if ('moduleExports' in compilationResult) {
    // don't return compilation results other than exports
    return { moduleExports: compilationResult.moduleExports }
  }
  // in case of error
  return compilationResult;
}

const getContextKeys = (mdxContext: MDXContext): string[] =>
  Object.keys(mdxContext).sort();

const getContextValues = (mdxContext: MDXContext): any[] =>
  getContextKeys(mdxContext).reduce((acc, key) => {
    acc.push((mdxContext)[key]);
    return acc;
  }, [] as any[]);

const makeInitialModuleLoaderContext = (context?: MDXContext): ModuleLoaderContext => ({
  requireStack: [],
  dependencies: new Set<string>([]),
  mdxContext: context ?? {
    definingTiddlerTitle: undefined,
    components: {}
  }
});

export class MDXModuleLoader {
  anonymousGeneratedFunctionCounter = 0;
  // TiddlyWiki standard objects, which default to global $tw.{wiki, modules}.
  wiki: $tw.Wiki;
  modules: $tw.TW5Modules;
  private compilationResults: Record<string, Promise<CompilationResult>> = {};
  private invalidatedModules: Set<string> = new Set([]);

  constructor({
    wiki = globalThis.$tw.wiki,
    modules = globalThis.$tw.modules,
  }: {
    wiki?: $tw.Wiki,
    modules?: $tw.TW5Modules,
  } = {}) {
    this.wiki = wiki;
    this.modules = modules;
  }

  private getRequireAsync(
    loadContext: ModuleLoaderContext,
  ): RequireAsync {
    return async (requiredModuleName: string) => {

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
      loadContext.dependencies.add(requiredModuleName);
      return maybeExports.moduleExports;
    };
  }

  private async compileMDX(
    tiddler: string | undefined,
    mdx: string,
    mdxContext: MDXContext
  ): Promise<MDXCompilationResult> {
    let fnName = tiddler;
    if (!fnName) {
      fnName = `mdx_generated_${this.anonymousGeneratedFunctionCounter++}`;
    }
    try {
      return await compile(fnName, mdx, getContextKeys(mdxContext));
    } catch (e) {
      return { error: e as Error };
    }
  };

  private async compileAndExecute({
    loadContext,
    mdx,
    tiddler,
  }: {
    loadContext: ModuleLoaderContext,
    mdx: string;
    tiddler?: string;
    requiredModules?: Set<string>;
  }): Promise<CompilationResult> {
    // To require() a module, it must have been registered with TiddlyWiki
    // either at boot time (js modules) or because MDX has already compiled and
    // registered the generated module with TiddlyWiki. For MDX dependencies,
    // compile them now so they can be required if necessary

    const requireAsync = this.getRequireAsync(
      loadContext,
    );
    const mdxContext = { ...loadContext.mdxContext, requireAsync };
    const compilationResult = await this.compileMDX(
      tiddler,
      mdx,
      mdxContext
    );
    if ("error" in compilationResult) {
      return {
        mdx,
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
      moduleExports.default = (props: any) =>
        jsxCompiledDefault({
          ...props,
          components: { ...(props?.components ?? {}), ...(mdxContext.components) },
        });

      return {
        ...compilationResult,
        dependencies: loadContext.dependencies,
        moduleExports,
        mdx
      };
    } catch (e) {
      if (e instanceof RequireAsyncError) {
        return e.props;
      }
      return { mdx, error: e as Error, errorTitle: "Error executing compiled MDX", loadContext };
    }
  };

  private async invokeDrop(tiddler: string, oldCompilationResult: Promise<CompilationResult>, newCompilationResult: Promise<CompilationResult>): Promise<void> {
    const result = await oldCompilationResult;
    if ('moduleExports' in result) {
      const moduleExports = result.moduleExports;
      if (MODULE_DROP_EXPORT_NAME in moduleExports) {
        try {
          moduleExports[MODULE_DROP_EXPORT_NAME](tiddler, result, newCompilationResult);
        } catch (e) {
          console.warn(`Error in ${tiddler}:__drop__(): ${String(e)}`);
        }
      }
    }
  }

  private async getModuleExports({
    loadContext: prevLoadContext,
    tiddler,
  }: {
    loadContext: ModuleLoaderContext;
    tiddler: string;
  }): Promise<ModuleExportsResult> {
    // Create a new loadContext with an empty requiredModules set.
    const loadContext = this.makeModuleLoaderContext(prevLoadContext, tiddler);

    // Prevent circular dependencies
    if (prevLoadContext.requireStack.includes(tiddler)) {
      return {
        error: new Error(`Importing '${tiddler}' causes circular dependencies. Full chain: ${loadContext.requireStack.join('→')}`),
        errorTitle: "Circular dependency detected",
        loadContext
      };
    }

    // There are several possible scenarios:
    // 1. The module is JS, has already been execute()-ed and $tw.modules.title[$TITLE].exports exists.
    // 2. The module is JS, has been defined ($tw.modules.title[$TITLE] exists), but has not been run yet and thus it's exports aren't available yet.
    // 3. The module is MDX, has been evaluated, is not invalidated, exports are available.
    // 4. The module is MDX, evaluation has started, is not invalidated, but has not yet completed.
    // 5. The module is MDX, has not yet been evaluated or has been invalidated, so exports aren't available yet, compilation is necessary


    if (tiddler in this.modules.titles) {
      if (this.modules.titles[tiddler].exports) {
        // Case 1: module's exports already exist
        return { moduleExports: this.modules.titles[tiddler].exports! };
      }
      // Case 2: JS module needs to be execute()-ed
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

    // Cases 3 & 4: MDX module's compilation has already begun (possibly completed)
    if (!this.invalidatedModules.has(tiddler) && (tiddler in this.compilationResults)) {
      return compilationResultToModuleExports(await this.compilationResults[tiddler]);
    }

    // Case 5: MDX module needs execution

    // Fail if tiddler not found
    const tiddlerObj = this.wiki.getTiddler(tiddler);
    if (!tiddlerObj) {
      return {
        error: new Error(`Tiddler '${tiddler}' not found in wiki.`),
        errorTitle: "Tiddler not found",
        loadContext
      };
    }

    // Cannot evaluate non-MDX tiddlers not registered under $tw.modules
    if (tiddlerObj?.fields?.type !== MD_MIME_TYPE) {
      return {
        error: new Error(
          `Tiddler '${tiddler}' has type ${tiddlerObj.fields.type}; MDX tiddlers must have type ${MD_MIME_TYPE}`
        ),
        errorTitle: "Wrong MIME type",
        loadContext
      };
    }

    const mdx = tiddlerObj.fields.text ?? "";

    const compilationResultPromise = this.compileAndExecute({
      loadContext,
      tiddler,
      mdx,
    });

    // If recompiling an invalidated module, invoke drop() if defined
    if (tiddler in this.compilationResults) {
      await this.invokeDrop(tiddler, this.compilationResults[tiddler], compilationResultPromise);
    }

    // Save promise to compilationResults before it's value is available to
    // avoid simulatenous invocations for the same module.
    this.compilationResults[tiddler] = compilationResultPromise
    // If recompiling an invalidated module, remove invalidation marker.
    this.invalidatedModules.delete(tiddler);
    return compilationResultToModuleExports(await compilationResultPromise);
  };

  private makeModuleLoaderContext(prevLoadContext: ModuleLoaderContext, tiddler?: string): ModuleLoaderContext {
    const ctxt: ModuleLoaderContext = {
      requireStack: prevLoadContext.requireStack.slice(),
      mdxContext: { ...prevLoadContext.mdxContext },
      dependencies: new Set<string>([])
    };
    if (tiddler) {
      ctxt.mdxContext.definingTiddlerTitle = tiddler;
      ctxt.requireStack.push(tiddler);
    }
    return ctxt
  };

  async getCompilationResult(tiddler: string): Promise<CompilationResult | undefined> {
    return tiddler in this.compilationResults ? await this.compilationResults[tiddler] : undefined;
  }

  async hasModule(tiddler: string): Promise<boolean> {
    return tiddler in this.compilationResults && 'moduleExports' in (await this.compilationResults[tiddler]);
  }

  async getDependencies(tiddler: string): Promise<ModuleSet> {
    if (tiddler in this.compilationResults) {
      const compilationResult = (await this.compilationResults[tiddler]);
      if ('dependencies' in compilationResult) {
        return compilationResult.dependencies;
      }
    }
    return new Set<string>([]);
  }

  async getConsumers(tiddler: string): Promise<ModuleSet> {
    return await Object.entries(this.compilationResults).reduce(async (consumerSetPromise, [title, compilationResultPromise]: [string, Promise<CompilationResult>]) => {
      const consumerSet = await consumerSetPromise;
      const compilationResult = await compilationResultPromise;
      if ('dependencies' in compilationResult && compilationResult.dependencies.has(tiddler)) {
        consumerSet.add(title);
      }
      return consumerSet;
    }, Promise.resolve(new Set<string>([])));
  }

  invalidateModule(tiddler: string): void {
    if (tiddler in this.compilationResults) {
      this.invalidatedModules.add(tiddler);
    }
  }

  async evaluateMDX({ mdx, context, moduleLoaderContext }: {
    mdx: string,
    context?: MDXContext,
    moduleLoaderContext?: ModuleLoaderContext
  }): Promise<CompilationResult> {
    const loadContext = moduleLoaderContext ?? makeInitialModuleLoaderContext(context);
    return await this.compileAndExecute({
      loadContext,
      mdx,
    });
  }

  async loadModule({
    tiddler, context
  }: {
    tiddler: string,
    context?: MDXContext,
  }): Promise<ModuleExportsResult> {
    return await this.getModuleExports({
      loadContext: makeInitialModuleLoaderContext(context),
      tiddler,
    })
  }

} // end class MDXModuleLoader
