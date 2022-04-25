// MDX and remark stuff
import { compileSync } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm' // Tables, footnotes, strikethrough, task lists, literal URLs.
import wikiLinkPlugin from 'remark-wiki-link';

// react stuff
import type { Root } from 'react-dom/client';
import React from 'react';
import { createRoot } from 'react-dom/client';
import * as ReactJSXRuntime from './react-jsx-runtime';

// from: https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html#updates-to-client-rendering-apis
export const renderToDOM = (component: React.ReactChild, container: HTMLElement) => {
  const root = createRoot(container);
  root.render(component);
  return root;
}

export const unmount = (root: Root) => root.unmount();

// replace async import expression with call to sync importFn()
const fixImports = (body: string) => body.replace(/= await import\(/, "= importFn(");

const wrap = (name: string, body: string) => `
(function ${name}(jsxFns, importFn) {
${fixImports(body)}
});

//# sourceURL=${name}.js
`

export const getComponent = (compiledJSX: any, importFn: any, components: any, additionalProps: any = {}) => {
  const fn: Function = compiledJSX(ReactJSXRuntime, importFn).default;
  return fn({
    components,
    ...additionalProps
  }) as React.ReactChild;
}

export const compile = (name: string, mdx: string) => {
  try {
    // trimStart() is needed because mdx doesn't tolerate leading newlines
    const compilerOutput = compileSync(mdx.trimStart(), {
      remarkPlugins: [remarkGfm, wikiLinkPlugin],
      useDynamicImport: true,
      jsx: false,
      outputFormat: 'function-body',
      format: 'mdx',
      jsxRuntime: 'automatic',
      jsxImportSource: 'react'
    });
    const jsSource = wrap(name,String(compilerOutput.value))
    return eval(jsSource);
  } catch (e) {
    throw new Error((e as Error).message);
  }
}
