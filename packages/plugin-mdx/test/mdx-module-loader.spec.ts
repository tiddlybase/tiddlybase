import { makeModuleLoaderContext, loadMDXModule, MDXContext } from '../src/widget/mdx-module-loader'
import type { } from "@tiddlybase/tw5-types/src/index";
import { jest } from '@jest/globals'
import TestRenderer from 'react-test-renderer';

// test renderer docs: https://reactjs.org/docs/test-renderer.html
export const renderToAST = (component: any) => TestRenderer.create(component).toJSON();

const makeMDXTiddler = (title: string, text: string): $tw.Tiddler => ({
  fields: {
    text,
    title,
    type: "text/x-markdown"
  }
}) as any as $tw.Tiddler;


const makeMockModules = () => {
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
  return modules;
}

const makeMockWiki = (tiddlers: Record<string, string>): $tw.Wiki => {
  const getTiddler = jest.fn<(s: string) => $tw.Tiddler | undefined>((title: string) => makeMDXTiddler(title, tiddlers[title]));
  return {
    getTiddler
  } as any as $tw.Wiki;
}

const setup = (wiki: $tw.Wiki, definingTiddlerTitle = 'tiddler1') => {
  const modules = makeMockModules();
  const loadContext = makeModuleLoaderContext<MDXContext>({
    moduleContext: {
      definingTiddlerTitle,
      components: {}
    },
    wiki,
    modules
  });
  return { modules, loadContext }
}

describe('load MDX module by tiddler title', () => {


  it('load mdx without dependencies', async function () {
    const wiki = makeMockWiki({ tiddler1: '# hi!' });
    const { modules, loadContext } = setup(wiki);
    const result = await loadMDXModule({
      tiddler: 'tiddler1',
      loadContext
    });
    expect(Object.keys(result)).toContain('moduleExports');
    if ('moduleExports' in result) {
      expect(modules.titles.tiddler1).toEqual({
        definition: result.moduleExports!,
        exports: result.moduleExports!,
        moduleType: 'library',
        requires: new Set<string>()
      });
      expect(renderToAST(result.moduleExports.default())).toEqual({ type: 'h1', props: {}, children: ['hi!'] });
    }
    expect(loadContext.requireStack).toEqual(['tiddler1']);
  })

  it('load mdx without dependencies', async function () {
    const wiki = makeMockWiki({
      tiddler1: '# hi!',
      tiddler2: `
      import {default as d} from "tiddler1";

      {d()}

      asdf
      `
    });
    const { modules, loadContext } = setup(wiki, 'tiddler2');
    const result = await loadMDXModule({
      tiddler: 'tiddler2',
      loadContext
    });
    expect(Object.keys(result)).toContain('moduleExports');
    if ('moduleExports' in result) {
      expect(modules.titles.tiddler2).toEqual({
        definition: result.moduleExports!,
        exports: result.moduleExports!,
        moduleType: 'library',
        requires: new Set<string>(['tiddler1'])
      });
      expect(renderToAST(result.moduleExports.default())).toEqual([
        { type: 'h1', props: {}, children: ['hi!'] }
        ,"\n" as any,
        { type: 'p', props: {}, children: ['asdf'] }
      ])
    }
    expect(loadContext.requireStack).toEqual(['tiddler2', 'tiddler1']);
    expect(Object.keys(modules.titles)).toEqual([ 'tiddler1', 'tiddler2' ]);
  })

})
