import { CompilationResult, MDXContext, MDXModuleLoader, ModuleSet } from '../src/widget/mdx-module-loader'
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

const assertRegisteredModules = async (loader: MDXModuleLoader, moduleNames: Array<string>): Promise<void> => {
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

const assertDependencies = async (loader: MDXModuleLoader, module: string, dependsOn: Array<string>): Promise<void> => {
  expect(await loader.getDependencies(module)).toEqual(new Set(dependsOn));
}


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

const makeMockWiki = (tiddlers: Record<string, string>): $tw.Wiki => {
  const getTiddler = jest.fn<(s: string) => $tw.Tiddler | undefined>((title: string) => {
    return title in tiddlers ? makeMDXTiddler(title, tiddlers[title]) : undefined;
  });
  return {
    getTiddler
  } as any as $tw.Wiki;
}

const setup = (tiddlers: Record<string, string>) => {
  const wiki = makeMockWiki(tiddlers);
  const modules = makeMockModules();
  const loader = new MDXModuleLoader({ wiki, modules });
  return { modules, wiki, loader };
}

describe('load MDX module by tiddler title', () => {


  it('load mdx module without dependencies', async function () {
    const { loader } = setup({ tiddler1: '# hi!' });
    const result = await loader.loadModule({
      tiddler: 'tiddler1',
    });
    expect(Object.keys(result)).toContain('moduleExports');
    if ('moduleExports' in result) {
      const savedCompilationResult = await loader.getCompilationResult('tiddler1');
      expect(savedCompilationResult).not.toBeFalsy();
      expect(Object.keys(savedCompilationResult ?? {}).sort()).toEqual(["compiledFn", "dependencies", "moduleExports", "warnings"]);
      if ('moduleExports' in savedCompilationResult!) {
        expect(savedCompilationResult!.moduleExports).toEqual(
          result.moduleExports
        );
      }
      expect(renderToAST(result.moduleExports.default())).toEqual({ type: 'h1', props: {}, children: ['hi!'] });
    }
  })

  it('load mdx module with compilation warning', async function () {
    const { loader } = setup({
      tiddler1: `# hi!
- one
 *  two
` });
    const result = await loader.loadModule({
      tiddler: 'tiddler1',
    });
    expect(Object.keys(result)).toContain('moduleExports');
    if ('moduleExports' in result) {

      expect(renderToAST(result.moduleExports.default())).toEqual([
        {
          "type": "h1",
          "props": {},
          "children": [
            "hi!"
          ]
        },
        "\n" as any,
        {
          "type": "ul",
          "props": {},
          "children": [
            "\n",
            {
              "type": "li",
              "props": {},
              "children": [
                "one"
              ]
            },
            "\n"
          ]
        },
        "\n",
        {
          "type": "ul",
          "props": {},
          "children": [
            "\n",
            {
              "type": "li",
              "props": {},
              "children": [
                "two"
              ]
            },
            "\n"
          ]
        }
      ]);
    }
    const compilationResult = await loader.getCompilationResult('tiddler1');
    if (compilationResult && 'warnings' in compilationResult) {
      expect({ ...compilationResult.warnings[0] }).toEqual(
        {
          "name": "3:2",
          "message": "Incorrect indentation before bullet: remove 1 space",
          "reason": "Incorrect indentation before bullet: remove 1 space",
          "line": 3,
          "column": 2,
          "source": "remark-lint",
          "ruleId": "list-item-bullet-indent",
          "position": {
            "start": {
              "line": 3,
              "column": 2,
              "offset": 13
            },
            "end": {
              "line": null,
              "column": null
            }
          },
          "fatal": false,
          "url": "https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-list-item-bullet-indent#readme"
        });
      expect({ ...compilationResult.warnings[1] }).toEqual(
        {
          "name": "3:5",
          "message": "Incorrect list-item indent: remove 1 space",
          "reason": "Incorrect list-item indent: remove 1 space",
          "line": 3,
          "column": 5,
          "source": "remark-lint",
          "ruleId": "list-item-indent",
          "position": {
            "start": {
              "line": 3,
              "column": 5,
              "offset": 16
            },
            "end": {
              "line": null,
              "column": null
            }
          },
          "fatal": false,
          "url": "https://github.com/remarkjs/remark-lint/tree/main/packages/remark-lint-list-item-indent#readme"
        }
      )
    }
  })

  it('load mdx with dependency', async function () {
    const { loader } = setup({
      tiddler1: '# hi!',
      tiddler2: `
      import {default as d} from "tiddler1";

      {d()}

      asdf
      `
    });
    const result = await loader.loadModule({
      tiddler: 'tiddler2',
    });
    expect(Object.keys(result)).toContain('moduleExports');
    if ('moduleExports' in result) {
      await assertDependencies(loader, 'tiddler2', ['tiddler1'])
      expect(renderToAST(result.moduleExports.default())).toEqual([
        { type: 'h1', props: {}, children: ['hi!'] }
        , "\n" as any,
        { type: 'p', props: {}, children: ['asdf'] }
      ])
    }
    await assertRegisteredModules(loader, ['tiddler1', 'tiddler2']);
  })

  it('load mdx with syntax error in dependency', async function () {
    const { loader } = setup({
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
    const result = await loader.loadModule({
      tiddler: 'tiddler3'
    });
    expect(Object.keys(result).sort()).toEqual(["error", "errorTitle", "loadContext"]);
    if ('error' in result) {
      expect(result.error.message).toEqual("Could not parse expression with acorn: Unexpected token");
    }
    if ('loadContext' in result) {
      expect(result.loadContext.requireStack).toEqual(
        ['tiddler3', 'tiddler2', 'tiddler1']
      );
      expect(result.loadContext.mdxContext.definingTiddlerTitle).toEqual(
        'tiddler1'
      );
    }
    await assertRegisteredModules(loader, []);
  });

  it('load mdx with runtime error in dependency', async function () {
    const { loader } = setup({
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
    const result = await loader.loadModule({
      tiddler: 'tiddler3'
    });
    if ('moduleExports' in result) {
      expect(() => renderToAST(result.moduleExports.default())).toThrowError("BANG!");
    }
    await assertRegisteredModules(loader, ['tiddler1', 'tiddler2', 'tiddler3']);
  });

  it('load mdx with missing dependency', async function () {
    const { loader } = setup({
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
    const result = await loader.loadModule({
      tiddler: 'tiddler3'
    });
    expect(Object.keys(result).sort()).toEqual(["error", "errorTitle", "loadContext"]);
    if ('errorTitle' in result) {
      expect(result.errorTitle).toEqual('Tiddler not found');
    }
    if ('error' in result) {
      expect(result.error.message).toEqual("Tiddler 'tiddler1' not found in wiki.");
    }
    if ('loadContext' in result) {
      expect(result.loadContext.requireStack).toEqual(
        ['tiddler3', 'tiddler2', 'tiddler1']
      );
      expect(result.loadContext.mdxContext.definingTiddlerTitle).toEqual(
        'tiddler1'
      );
    }
    await assertRegisteredModules(loader, []);
  });

  it('load mdx with import error in dependency', async function () {
    const { modules, loader } = setup({
      tiddler1: `
      import {default as d} from "dep";

      {d()}

      asdf
      `
    });
    modules.titles['dep'] = {
      moduleType: 'library',
      definition: "throw new Error('bang');",
    }
    const result = await loader.loadModule({
      tiddler: 'tiddler1',
    });
    expect(Object.keys(result)).toContain('error');
    expect(await loader.getCompilationResult('tiddler1')).toEqual({
      "error": new Error('bang'),
      "errorTitle": "Error executing module dep",
      "loadContext": {
        "mdxContext": {
          "components": {},
          "definingTiddlerTitle": "dep",
        },
        "requireStack": [
          "tiddler1",
          "dep",
        ],
        "dependencies": new Set<string>([]),
      },
    }
    );
  })

  it('Throw error if circular dependency detected', async function () {
    const { loader } = setup({
      tiddler1: `
      import {default as d} from "tiddler3";

      {d()}

      baz
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
    const result = await loader.loadModule({
      tiddler: 'tiddler3'
    });
    expect(Object.keys(result).sort()).toEqual(["error", "errorTitle", "loadContext"]);
    if ('errorTitle' in result) {
      expect(result.errorTitle).toEqual('Circular dependency detected');
    }
    if ('error' in result) {
      expect(result.error.message).toEqual("Importing 'tiddler3' causes circular dependencies. Full chain: tiddler3→tiddler2→tiddler1→tiddler3");
    }
    if ('loadContext' in result) {
      expect(result.loadContext.requireStack).toEqual(
        ['tiddler3', 'tiddler2', 'tiddler1', 'tiddler3']
      );
      expect(result.loadContext.mdxContext.definingTiddlerTitle).toEqual(
        'tiddler3'
      );
    }
    await assertRegisteredModules(loader, []);
  });

  it('__drop__() called when module recompiled', async function () {
    const logEntries: string[] = [];
    const wikiTiddlers = {
      tiddler1: `
export const foo = "V1";

export const __drop__ = (tiddler, oldCompilationResult, newCompilationResultPromise) => {
  log("running __drop__ V1")
  oldCompilationResult.moduleExports.markedByDropV1 = true;
  newCompilationResultPromise.then(r => {
    log("running __drop__ V1 awaiting V2 result")
    r.moduleExports.markedByDropV1 = true;
  });
};

# hello V1
asdf
{log("executing default export V1")}
`
    }
    const context: MDXContext = {
      definingTiddlerTitle: 'tiddler1',
      log: (msg: string) => { logEntries.push(msg) },
      components: {}
    }
    const { loader } = setup(wikiTiddlers);
    // compile first version of tiddler
    const result = await loader.loadModule({
      tiddler: 'tiddler1',
      context
    });
    // assert initial version of module compiled as expected
    expect(Object.keys(result)).toContain('moduleExports');
    if ('moduleExports' in result) {
      expect(renderToAST(result.moduleExports.default())).toEqual([
        { type: 'h1', props: {}, children: ['hello V1'] },
        '\n' as any,
        { type: 'p', props: {}, children: ['asdf'] },
        '\n' as any,
      ]);
      expect(result.moduleExports.foo).toEqual("V1");
    }
    // redefine module tiddler
    wikiTiddlers.tiddler1 = `
export const foo = "V2";

export const __drop__ = (oldCompilationResult, newCompilationResultPromise) => {
  log("running __drop__ V2")
  oldCompilationResult.markedByDropV2 = true;
  newCompilationResultPromise.then(r => {
    r.markedByDropV2 = true;
  });
};

# hello V2
asdf
{log("executing default export V2")}
`
    loader.invalidateModule('tiddler1');
    // the loader still knows about invalidated modules
    expect(await loader.hasModule('tiddler1')).toEqual(true);
    // compile second version of tiddler
    const result2 = await loader.loadModule({
      tiddler: 'tiddler1',
      context
    });
    // assert initial version of module compiled as expected
    expect(Object.keys(result2)).toContain('moduleExports');
    if ('moduleExports' in result2) {
      expect(renderToAST(result2.moduleExports.default())).toEqual([
        { type: 'h1', props: {}, children: ['hello V2'] },
        '\n' as any,
        { type: 'p', props: {}, children: ['asdf'] },
        '\n' as any,
      ]);
      expect(result2.moduleExports.foo).toEqual("V2");
      expect(result2.moduleExports.markedByDropV1).toEqual(true);
      expect(result2.moduleExports.markedByDropV2).toEqual(undefined);
    }
    // verify old module "marked" by __drop__
    if ('moduleExports' in result) {
      expect(result.moduleExports.markedByDropV1).toEqual(true);
    }
    expect(logEntries).toEqual([
      'executing default export V1',
      'running __drop__ V1',
      'running __drop__ V1 awaiting V2 result',
      'executing default export V2'
    ]);
  })

})
