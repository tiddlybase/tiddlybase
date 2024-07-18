
import type { } from "@tiddlybase/tw5-types/src/index";

import {
  CompilationResult as MDXCompilationResult,
  compile,
  getExports,
} from "@tiddlybase/plugin-mdx/src/mdx-client/mdx-client";
import { MDXErrorDetails } from "../mdx-client/mdx-error-details";
import { getMdxTagFn } from "./mdx-tag-function";
import { withContextHelpers } from "./with-context-helpers";
import { MDXTiddlybaseAPIImpl } from "./mdx-tiddlybase-api-impl";
import { depthFirstSearch } from "@tiddlybase/shared/src/depth-first-search";
import type { MDXTiddlybaseAPI } from "./mdx-tiddlybase-api";
import { absPath } from "@tiddlybase/plugin-tiddlybase-utils/src/path-utils";

export type ModuleSet = Set<string>;

export interface ModuleLoaderContext {
  // stack of module names requiring each other leading to current module
  requireStack: string[];
  // direct requirements of currently loaded module (popuplated as imports are executed during load).
  dependencies: ModuleSet;
  // module-type (eg: MDX) specific context necessary for compiling
  // required modules module exports not already available.
  mdxContext: MDXContext;
  mdxLiteralCompilationResults?: Promise<CompilationResult>[];
}

export type ModuleLoadError = {
  error: MDXErrorDetails | Error;
  errorTitle: string;
  source?: string;
  loadContext: ModuleLoaderContext
};

export type CompilationResult = { mdx?: string } & (
  ModuleLoadError
  | { warnings: Array<MDXErrorDetails>; compiledFn: any; moduleExports: $tw.ModuleExports; dependencies: ModuleSet; tiddler?: string });

export type ModuleExportsResult =
  | ModuleLoadError
  | { moduleExports: $tw.ModuleExports }

type RequireAsync = (requiredModuleName: string) => Promise<$tw.ModuleExports>;

type CompilationResultWithChangeCount = {
  result: Promise<CompilationResult>;
  changeCount: number;
}

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

export class MDXModuleLoader {
  anonymousGeneratedFunctionCounter = 0;
  // TiddlyWiki standard objects, which default to global $tw.{wiki, modules}.
  wiki: $tw.Wiki;
  modules: $tw.TW5Modules;
  mdxTiddlybaseAPI: MDXTiddlybaseAPI;
  private wikiChangeEventCounter = 0;
  private compilationResults: Record<string, CompilationResultWithChangeCount> = {};
  private invalidationChangeCount: Record<string, number> = {};
  private lastInvalidationTask: Promise<boolean> = Promise.resolve(true);

  constructor({
    wiki = $tw.wiki,
    modules = $tw.modules,
  }: {
    wiki?: $tw.Wiki,
    modules?: $tw.TW5Modules,
  } = {}) {
    this.wiki = wiki;
    this.modules = modules;
    this.mdxTiddlybaseAPI = new MDXTiddlybaseAPIImpl(this.wiki)
  }

  private makeInitialModuleLoaderContext(context?: MDXContext): ModuleLoaderContext {
    return {
      requireStack: [],
      dependencies: new Set<string>([]),
      mdxContext: context ?? {
        definingTiddlerTitle: undefined,
        components: {},
        tiddlybase: this.mdxTiddlybaseAPI
      }
    };
  }

  private wrapExports(moduleName: string, moduleExports: $tw.ModuleExports) {
    // https://stackoverflow.com/a/45322399/22709529
    const handler = {
      get(target: $tw.ModuleExports, property: string) {
        if (property in target) {
          return target[property];
        }
        if (property == 'then')  {
          // not Thenable
          return null;
        }

        throw new Error(`Export '${property}' is not defined on module ${moduleName}`);
      }
    };

    return new Proxy(moduleExports, handler);
  }

  private getRequireAsync(
    loadContext: ModuleLoaderContext,
  ): RequireAsync {
    return async (requiredModuleName: string) => {

      const absTiddlerName = requiredModuleName.startsWith('.') ? absPath(`${loadContext.mdxContext.definingTiddlerTitle}/../${requiredModuleName}`) : requiredModuleName;

      const maybeExports = await this.getModuleExports({
        loadContext,
        tiddler: absTiddlerName,
      });

      if ("error" in maybeExports) {
        throw new RequireAsyncError({
          error: maybeExports.error,
          errorTitle: maybeExports.errorTitle,
          loadContext: maybeExports.loadContext
        });
      }
      loadContext.dependencies.add(absTiddlerName);
      return this.wrapExports(absTiddlerName, maybeExports.moduleExports);
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
    boundProps
  }: {
    loadContext: ModuleLoaderContext,
    mdx: string;
    tiddler?: string;
    boundProps?: object
  }): Promise<CompilationResult> {
    const moduleExports: $tw.ModuleExports = {};
    const mdxContext: MDXContext = { ...loadContext.mdxContext, exports: moduleExports };
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
      const { default: jsxCompiledDefault, ..._moduleExports } = await getExports(
        compilationResult.compiledFn,
        mdxContext.requireAsync,
        getContextValues(mdxContext)
      );
      Object.assign(moduleExports, _moduleExports);

      // add mdxContext.components and any additional boundProps to the component's
      // props in addition to what's passed in by the caller.
      moduleExports.default = withContextHelpers(jsxCompiledDefault, mdxContext.components, boundProps);

      return {
        ...compilationResult,
        dependencies: loadContext.dependencies,
        tiddler,
        moduleExports,
        mdx
      };
    } catch (e) {
      if (e instanceof RequireAsyncError) {
        return e.props;
      }
      return { mdx, error: e as Error, errorTitle: `Error executing compiled MDX`, loadContext, source: compilationResult.compiledFn.toString() };
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

    // Cases 3 & 4 (we can't tell the difference): MDX module's compilation has already begun (possibly completed)
    // Note that a tiddler might be valid in the sense that it's source and the
    // compilation result are in sync but the compilation may have failed with an error.
    await this.lastInvalidationTask;
    if ((tiddler in this.compilationResults) && !this.isModuleInvalid(tiddler)) {
      return compilationResultToModuleExports(await this.compilationResults[tiddler].result);
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
      await this.invokeDrop(tiddler, this.compilationResults[tiddler].result, compilationResultPromise);
    }

    // Save promise to compilationResults before it's value is available to
    // avoid simulatenous invocations for the same module.
    this.compilationResults[tiddler] = { result: compilationResultPromise, changeCount: this.wikiChangeEventCounter }
    // await literal MDX compilation (if any)
    await Promise.all(loadContext.mdxLiteralCompilationResults ?? []);
    const result = await compilationResultPromise;
    if (this.invalidationChangeCount[tiddler] > this.compilationResults[tiddler].changeCount) {
      // If the invalidation code in the loadContext and the this.invalidationCodes do not match then the
      // module has been invalidated as it was being recompiled and therefore must be recompiled
      console.log(`Warning: invalidation code mismatch ${tiddler} ${this.invalidationChangeCount[tiddler]} ${this.compilationResults[tiddler].changeCount}`);
    } else {
      // Remove invalidation marker. If compilation failed, we will get an error message
      // from any tiddler importing this tiddler (since the corresponding module
      // no longer exists).
      delete this.invalidationChangeCount[tiddler];
    }
    return compilationResultToModuleExports(result);
  };

  private makeModuleLoaderContext(prevLoadContext: ModuleLoaderContext, tiddler?: string): ModuleLoaderContext {
    const ctxt: ModuleLoaderContext = {
      requireStack: prevLoadContext.requireStack.slice(),
      mdxContext: {
        ...prevLoadContext.mdxContext,
      },
      dependencies: new Set<string>([])
    };
    ctxt.mdxContext.requireAsync = this.getRequireAsync(ctxt);
    ctxt.mdxContext.mdx = getMdxTagFn({ loader: this, moduleLoaderContext: ctxt });
    if (tiddler) {
      ctxt.mdxContext.definingTiddlerTitle = tiddler;
      ctxt.requireStack.push(tiddler);
    }
    return ctxt
  };

  async getCompilationResult(tiddler: string): Promise<CompilationResult | undefined> {
    return tiddler in this.compilationResults ? await this.compilationResults[tiddler].result : undefined;
  }

  hasModule(tiddler: string): boolean {
    return tiddler in this.compilationResults;
  }

  async getDependencies(tiddler: string): Promise<ModuleSet> {
    if (tiddler in this.compilationResults) {
      const compilationResult = await this.compilationResults[tiddler].result;
      if ('dependencies' in compilationResult) {
        return compilationResult.dependencies;
      }
    }
    return new Set<string>([]);
  }

  async getConsumers(tiddler: string): Promise<ModuleSet> {
    return await Object.entries(this.compilationResults).reduce(async (consumerSetPromise, [title, { result }]: [string, CompilationResultWithChangeCount]) => {
      const consumerSet = await consumerSetPromise;
      const compilationResult = await result;
      if ('dependencies' in compilationResult && compilationResult.dependencies.has(tiddler)) {
        consumerSet.add(title);
      }
      return consumerSet;
    }, Promise.resolve(new Set<string>([])));
  }

  _handleWikiChange(wikiChange: $tw.WikiChange): void {
    this.wikiChangeEventCounter += 1;
    Object.keys(wikiChange).forEach(tiddler => {
      this.invalidateModule(tiddler, this.wikiChangeEventCounter);
    });
  }

  private updateInvalidationChangeCount(tiddler: string, changeCount: number): void {
    this.invalidationChangeCount[tiddler] = Math.max(
      this.invalidationChangeCount[tiddler] ?? 0,
      changeCount)
  }

  private invalidateModule(tiddler: string, changeCount: number): void {
    /* TiddlyWiki synchronously dispatches
      a tiddler change and then a widget refresh event. The MDX tiddler must be
      invalidated between those for the new version of the tiddler to be
      rendered.
      Unfortunately, transitive dependencies cannot be invalidated synchronously
      since the result of the MDX compilation step (including the list of
      dependencies) is stored in a Promise. The solution is to invalidate the
      tiddler synchronously but also invoking an async function to invalidate
      transitive dependencies.

      This could result in the following race condition:
      It's possible that a given tiddler A is in the process of being compiled
      when tiddler B -which is imported by A- is saved.
      This would cause A to be invalidated, but when the previously started
      compilation completes, A's invalidated status is cleared. To prevent such
      races, MDXModuleLoader keeps track of the number of wiki change events
      dispatched by the wiki and who many such events occurred since the last
      invalidation.

      The second (async) invalidation must be awaited in getModuleExports.
     */

    // update invalidationChangeCount for tiddler syncrhonously
    if (tiddler in this.compilationResults) {
      this.updateInvalidationChangeCount(tiddler, changeCount);
    }
    // update invalidationChangeCount for dependents asynchronously
    this.lastInvalidationTask = this.getTransitiveConsumers(tiddler).then(modules => {
      modules.forEach(dependent => {
        this.updateInvalidationChangeCount(dependent, changeCount);
      })
      return true;
    })
  }

  private isModuleInvalid(tiddler: string) {
    const compiledChangeCount = this.compilationResults[tiddler]?.changeCount;
    const invalidatedChangeCount = this.invalidationChangeCount[tiddler];
    return (typeof invalidatedChangeCount === "number") && (typeof compiledChangeCount === "number") &&
      (compiledChangeCount <= invalidatedChangeCount);
  }

  async evaluateMDX({ mdx, context, moduleLoaderContext, boundProps }: {
    mdx: string,
    context?: MDXContext,
    moduleLoaderContext?: ModuleLoaderContext,
    boundProps?: object
  }): Promise<CompilationResult> {
    const loadContext = moduleLoaderContext ?? this.makeModuleLoaderContext(this.makeInitialModuleLoaderContext(context));
    return await this.compileAndExecute({
      loadContext,
      mdx,
      boundProps
    });
  }

  async loadModule({
    tiddler, context
  }: {
    tiddler: string,
    context?: MDXContext,
  }): Promise<ModuleExportsResult> {
    return await this.getModuleExports({
      loadContext: this.makeInitialModuleLoaderContext(context),
      tiddler,
    })
  }

  // NOTE: includes the module itself in the set of dependencies
  async getTransitiveDependencies(moduleName: string, visited: Set<string> = new Set<string>([])): Promise<ModuleSet> {
    if (this.hasModule(moduleName)) {
      await depthFirstSearch(
        (moduleName: string) => this.getDependencies(moduleName),
        moduleName,
        visited);
    }
    return visited;
  }

  // NOTE: includes the module itself in the set of consumers
  async getTransitiveConsumers(moduleName: string, visited: Set<string> = new Set<string>([])): Promise<ModuleSet> {
    if (this.hasModule(moduleName)) {
      await depthFirstSearch(
        (moduleName: string) => this.getConsumers(moduleName),
        moduleName,
        visited);
    }
    return visited;
  }


} // end class MDXModuleLoader
