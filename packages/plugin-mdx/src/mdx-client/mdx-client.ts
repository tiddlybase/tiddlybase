// MDX and remark stuff
import { compile as compileMDX } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm' // Tables, footnotes, strikethrough, task lists, literal URLs.
import wikiLinkPlugin from 'remark-wiki-link';
import * as ReactJSXRuntime from 'react/jsx-runtime';


// replace async import expression with call to sync importFn()
const fixImports = (body: string) => body.replace(/= await import\(/, "= await importFn(");

const wrap = (name: string, body: string, contextVars: string[]) => `
(async function ${name}(${['jsxFns', 'importFn'].concat(contextVars).join(', ')}) {
${fixImports(body)}
});

//# sourceURL=${name}.js
`

export const getComponent = async (compiledJSX: any, importFn: any, components: any, contextValues: any[] = []) => {
  const mdxExports = await compiledJSX(ReactJSXRuntime, importFn, ...contextValues);
  const fn: Function = mdxExports.default;
  // react component returned
  return (props:any) => fn({...props, components});
}

export const compile = async (name: string, mdx: string, contextKeys: string[] = []) => {
  try {
    // trimStart() is needed because mdx doesn't tolerate leading newlines
    const compilerOutput = await compileMDX(mdx.trimStart(), {
      remarkPlugins: [
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
    const jsSource = wrap(name, String(compilerOutput.value), contextKeys)
    return eval(jsSource);
  } catch (e) {
    throw new Error((e as Error).message);
  }
}
