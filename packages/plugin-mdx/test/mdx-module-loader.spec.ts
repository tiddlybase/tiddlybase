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
    tiddler: definingTiddlerTitle,
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
  })

  it('load mdx with dependency', async function () {
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
        , "\n" as any,
        { type: 'p', props: {}, children: ['asdf'] }
      ])
    }
    expect(Object.keys(modules.titles)).toEqual(['tiddler1', 'tiddler2']);
  })

  it('load mdx with syntax error in dependency', async function () {
    const wiki = makeMockWiki({
      tiddler1: `# hi!
      {js_compile_error = }
      `,
      tiddler2: `
      import {default as d} from "tiddler1";

      {d()}

      bar
      `,
      tiddler3: `
      import {default as d} from "tiddler2";

      {d()}

      foo
      `
    });
    const { modules, loadContext } = setup(wiki, 'tiddler3');
    const result = await loadMDXModule({
      tiddler: 'tiddler3',
      loadContext
    });
    expect(Object.keys(result).sort()).toEqual(["error", "errorTitle", "loadContext"]);
    if ('error' in result) {
      expect(result.error.message).toEqual("Could not parse expression with acorn: Unexpected token");
    }
    if ('loadContext' in result) {
      expect(result.loadContext.requireStack).toEqual(
        ['tiddler3', 'tiddler2', 'tiddler1']
      );
      expect(result.loadContext.moduleContext.definingTiddlerTitle).toEqual(
        'tiddler1'
      );
    }
    expect(Object.keys(modules.titles)).toEqual([]);
  });

  it('load mdx with runtime error in dependency', async function () {
    const wiki = makeMockWiki({
      tiddler1: `# hi!

export const bang = () => {throw new Error("BANG!");}

asdf
      `,
      tiddler2: `
      import {bang} from "tiddler1";

      {bang()}

      bar
      `,
      tiddler3: `
      import {default as d} from "tiddler2";

      {d()}

      foo
      `
    });
    const { modules, loadContext } = setup(wiki, 'tiddler3');
    const result = await loadMDXModule({
      tiddler: 'tiddler3',
      loadContext
    });
    if ('moduleExports' in result) {
      expect(() => renderToAST(result.moduleExports.default())).toThrowError("BANG!");
    }
    expect(Object.keys(modules.titles).sort()).toEqual(['tiddler1', 'tiddler2', 'tiddler3']);
  });

})
