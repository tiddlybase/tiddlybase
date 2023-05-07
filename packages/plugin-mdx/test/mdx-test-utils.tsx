import { CompilationResult, MDXModuleLoader, ModuleExportsResult, ModuleSet } from '../src/widget/mdx-module-loader'
import type { } from "@tiddlybase/tw5-types/src/index";
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
