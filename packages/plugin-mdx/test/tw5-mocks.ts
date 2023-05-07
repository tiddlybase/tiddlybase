import type { } from "@tiddlybase/tw5-types/src/index";
import { jest } from '@jest/globals'
import { MDXModuleLoader } from "../src/widget/mdx-module-loader";

export const makeTiddler = (fields: $tw.TiddlerFields): $tw.Tiddler => (
  { fields }
) as any as $tw.Tiddler;

export const makeMDXTiddler = (title: string, tiddler: string|$tw.TiddlerFields): $tw.Tiddler => typeof tiddler === 'string' ? makeTiddler({
  title,
  text: tiddler,
  type: "text/x-markdown",
}) : makeTiddler(tiddler);

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

export const INITIAL_CREATED_DATE = 0;
export const INITIAL_MODIFIED_DATE = 1683442259360;

export const getCreatedDate = (index:number) => new Date(INITIAL_CREATED_DATE + index*1000);
export const getModifiedDate = (index:number) => new Date(INITIAL_MODIFIED_DATE + index*1000);

export const makeMockWiki = (tiddlers: Record<string, string|$tw.TiddlerFields>): $tw.Wiki => {
  const getTiddler = jest.fn<(s: string) => $tw.Tiddler | undefined>((title: string) => {
    return title in tiddlers ? makeMDXTiddler(title, tiddlers[title]) : undefined;
  });
  const addTiddler = jest.fn<(tiddler: $tw.Tiddler | $tw.TiddlerFields) => void>((tiddler: $tw.Tiddler | $tw.TiddlerFields) => {
    const fields = typeof tiddler["fields"] === 'object' ? tiddler.fields : tiddler;
    tiddlers[fields.title] = fields;
  });
  let getModificationFieldsInvocations = 0;
  let getCreationFieldsInvocations = 0;
  const getCreationFields = () => ({ created: getCreatedDate(getCreationFieldsInvocations++) });
  const getModificationFields = () => ({ modified: getModifiedDate(getModificationFieldsInvocations++) });
  return {
    getTiddler,
    addTiddler,
    getCreationFields,
    getModificationFields
  } as any as $tw.Wiki;
}

export const setup = (tiddlers: Record<string, string>={}) => {
  const wiki = makeMockWiki(tiddlers);
  const modules = makeMockModules();
  const loader = new MDXModuleLoader({ wiki, modules });
  return { modules, wiki, loader };
}
