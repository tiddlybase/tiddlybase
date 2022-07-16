/// <reference types="./types" />
// MDX and remark stuff
import { compile as compileMDX } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm' // Tables, footnotes, strikethrough, task lists, literal URLs.
import wikiLinkPlugin from 'remark-wiki-link';
import * as ReactJSXRuntime from 'react/jsx-runtime';
import remarkPresetLintConsistent from 'remark-preset-lint-consistent'
import remarkPresetLintRecommended from 'remark-preset-lint-recommended'

// replace async import expression with call to sync importFn()
const fixImports = (body: string) => body.replace(/= await import\(/mg, "= await importFn(");

const wrap = (name: string, body: string, contextVars: string[]) => `
(async function _mdx_generated(${['jsxFns', 'importFn'].concat(contextVars).join(', ')}) {
${fixImports(body)}
});

//# sourceURL=${name}.js
`

export const getExports = async (compiledJSX: any, importFn: any, components: any, contextValues: any[] = []) => {
  return await compiledJSX(ReactJSXRuntime, importFn, ...contextValues);
}

export const compile = async (name: string, mdx: string, contextKeys: string[] = []) => {
  try {
    // trimStart() is needed because mdx doesn't tolerate leading newlines
    const compilerOutput = await compileMDX(mdx.trimStart(), {
      remarkPlugins: [
        remarkPresetLintConsistent,
        remarkPresetLintRecommended,
        remarkGfm,
        [wikiLinkPlugin, {
          pageResolver: (x: string) => [x],
          hrefTemplate: (x: string) => x,
          aliasDivider: '|'
        }]],
      useDynamicImport: true,
      jsx: false,
      outputFormat: 'function-body',
      format: 'mdx',
      jsxRuntime: 'automatic',
      jsxImportSource: 'react'
    });
    const jsSource = wrap(name, String(compilerOutput.value), contextKeys);
    console.log("compilerOutput", compilerOutput);
    return eval(jsSource);
  } catch (e) {
    console.log("compiler error", Object.assign({}, e));
    throw new Error(`${Object.entries((e as any)?.position?.start ?? {}).map(([k, v]) => `${k}: ${String(v)}`).join(" ")} ${(e as Error).message}`);
  }
}
