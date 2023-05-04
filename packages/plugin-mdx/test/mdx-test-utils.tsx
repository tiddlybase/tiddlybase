import { CompilationResult, MDXModuleLoader, ModuleExportsResult, ModuleSet } from '../src/widget/mdx-module-loader'
import type { } from "@tiddlybase/tw5-types/src/index";
import { jest } from '@jest/globals'
import '@testing-library/jest-dom/extend-expect'
import "@testing-library/jest-dom";
import {
  TW5ReactContextType,
  withContextProvider,
} from "@tiddlybase/plugin-react/src/components/TW5ReactContext";
import { render, screen } from "@testing-library/react";
import React from 'react';

export const stripNewlines = (str: string): string => str.replace(/\n/gm, "");

export const getRendered = async (
  result: ModuleExportsResult,
  waitForText: string,
  context?: TW5ReactContextType,
  props?: any
) => {
  if ("moduleExports" in result) {
    if ("default" in result.moduleExports) {
      const Component = result.moduleExports.default as React.FC<any>;
      let renderer: ReturnType<typeof render>;
      if (context) {
        renderer = render(
          withContextProvider({
            context,
            Component,
            props,
          })
        );
      } else {
        renderer = render(<Component {...props} />);
      }

      expect(await screen.findByText(waitForText)).toBeVisible()
      return renderer.container;
    }
  }
  console.log(result);
  throw new Error("no default export found!");
};

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

export const assertElementVisible = async (Component: React.FC, text: string) => {
  render(<Component />);
  expect(await screen.findByText(text)).toBeVisible();
};

export const makeMockContext = (
  tiddler: string,
  wiki: $tw.Wiki,
  variables?: Record<string, any>
): TW5ReactContextType => {
  const vars: Record<string, any> = { ...variables, currentTiddler: tiddler };
  const context = {
    parentWidget: {
      wiki,
      getVariable(varname) {
        return vars[varname];
      },
    },
  } as TW5ReactContextType;
  return context;
};
