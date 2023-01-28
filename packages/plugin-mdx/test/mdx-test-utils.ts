import { CompilationResult, MDXModuleLoader, ModuleSet } from '../src/widget/mdx-module-loader'
import type { } from "@tiddlybase/tw5-types/src/index";
import { jest } from '@jest/globals'
import TestRenderer from 'react-test-renderer';

// test renderer docs: https://reactjs.org/docs/test-renderer.html
export const renderToAST = (component: any) => TestRenderer.create(component).toJSON();

export const makeMDXTiddler = (title: string, text: string): $tw.Tiddler => ({
  fields: {
    text,
    title,
    type: "text/x-markdown"
  }
}) as any as $tw.Tiddler;

export const assertRegisteredModules = async (loader: MDXModuleLoader, moduleNames: Array<string>): Promise<void> => {
  // access to private class field
  const knownModules: ModuleSet = new Set<string>([]);
  const compilationResults: Record<string, Promise<CompilationResult>> = (loader as any).compilationResults;
  for (let [title, resultPromise] of Object.entries(compilationResults)) {
    if ('moduleExports' in (await resultPromise)) {
      knownModules.add(title);
    }
  }
  expect(knownModules).toEqual(new Set(moduleNames));
}

export const assertDependencies = async (loader: MDXModuleLoader, module: string, dependsOn: Array<string>): Promise<void> => {
  expect(await loader.getDependencies(module)).toEqual(new Set(dependsOn));
}

export const makeMockModules = () => {
  const modules = {
    titles: {}
  } as any as $tw.TW5Modules;
  modules.define = jest.fn<$tw.TW5Modules["define"]>(
    (moduleName: string, moduleType: $tw.ModuleType, definition: string | $tw.ModuleExports) => {
      modules.titles[moduleName] = {
        definition,
        exports: definition as $tw.ModuleExports,
        moduleType,
        requires: new Set<string>()
      }
    }
  );
  modules.execute = jest.fn<$tw.TW5Modules["execute"]>(
    (moduleName: string, _: string | undefined): $tw.ModuleExports => {
      const def = modules.titles[moduleName].definition;
      if (typeof def === 'string') {
        return eval(def);
      }
      return {};
    }
  );
  return modules;
}

export const makeMockWiki = (tiddlers: Record<string, string>): $tw.Wiki => {
  const getTiddler = jest.fn<(s: string) => $tw.Tiddler | undefined>((title: string) => {
    return title in tiddlers ? makeMDXTiddler(title, tiddlers[title]) : undefined;
  });
  return {
    getTiddler
  } as any as $tw.Wiki;
}

export const setup = (tiddlers: Record<string, string>) => {
  const wiki = makeMockWiki(tiddlers);
  const modules = makeMockModules();
  const loader = new MDXModuleLoader({ wiki, modules });
  return { modules, wiki, loader };
}
