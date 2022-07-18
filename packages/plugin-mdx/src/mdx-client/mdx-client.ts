/// <reference types="./types" />
// MDX and remark stuff
import { compile as compileMDX } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm' // Tables, footnotes, strikethrough, task lists, literal URLs.
import wikiLinkPlugin from 'remark-wiki-link';
import * as ReactJSXRuntime from 'react/jsx-runtime';
import remarkPresetLintConsistent from 'remark-preset-lint-consistent'
import remarkPresetLintRecommended from 'remark-preset-lint-recommended'
import { MDXErrorDetails } from './mdx-error-details';

export type CompilationResult = {error: MDXErrorDetails|Error} | {warnings: Array<MDXErrorDetails>, compiledFn: any}

// replace async import expression with call to sync importFn()
const fixImports = (body: string) => body.replace(/= await import\(/mg, "= await importFn(");

const wrap = (name: string, body: string, contextVars: string[]) => `
(async function _mdx_generated(${['jsxFns', 'importFn'].concat(contextVars).join(', ')}) {
${fixImports(body)}
});

//# sourceURL=${name}.js
`

export const getExports = async (compiledJSX: any, importFn: any, contextValues: any[] = []) => {
  return await compiledJSX(ReactJSXRuntime, importFn, ...contextValues);
}

export const compile = async (name: string, mdx: string, contextKeys: string[] = []):Promise<CompilationResult> => {
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
    return {compiledFn: eval(jsSource), warnings: compilerOutput.messages as MDXErrorDetails[]};
  } catch (e) {
    return {error: Object.assign({}, e as Error)};
  }
}
