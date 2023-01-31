import type { CompilationResult, MDXModuleLoader, ModuleLoaderContext } from "./mdx-module-loader";
import { withAsyncComponent } from "@tiddlybase/plugin-react/src/components/withAsyncComponent";

import React from "react";
import { wrapMDXComponent } from "./mdx-util";
import { JSError } from "@tiddlybase/plugin-react/src/components/JSError";

export interface CompiledMDXLiteral extends React.FunctionComponent<any> {
    // A compiled MDX literal also provides access to it's compilationResult obj
    compilationResult?: CompilationResult;
    exports?: $tw.ModuleExports;
}

export const constructMDXContent = (stringParts: string[]): string => stringParts.reduce(
  (content, part, partIx) => {
    const parts: string[] = [content, part];
    if (partIx < stringParts.length - 1) {
      parts.push(`{props.literalBoundValues[${partIx}]}`);
    }
    return parts.join('');
  }, "").trim();

/**
 * There are multiple ways to use MDX literals:
 *
 * # 1. Avoiding repeating static content within a tiddler
 * For example,
 * ```markdown
 * export const copyright = mdx`*Copyright* (c) [[email|mailto:copyright-holder@acme.com]]; 1984-2023. All rights reserved`;
 *
 * {copyright}
 * ... a bunch of text ...
 * {copyright}
 *
 * finally, lest you forget,
 * {copyright}
 * ```
 *
 * # 2. Sharing static content between tiddlers
 * Consider a `ShortStory` tidder which includes the copyright notice from the `Copyright` tiddler
 * ```markdown
 * import {copyright} from 'Copyright';
 *
 * Once upon a time
 * ...
 * The end.
 *
 * {copyright}
 * ```
 *
 * # 3. Dynamically create MDX content during render time
 * Naively, this would look like:
 * ```markdown
 * export const namelink = (name) => mdx`[[${name}]]`
 *
 * Authors: {namelink("Peter")} and {namelink("Paul")}
 * ```
 * The problem here is that the javascript code returned by the mdx compiler
 * doesn't depend on `name` (it will be passed in as a prop), but each call
 * to `namelink()` will still unnecessarily invoke the compiler.
 * A more efficient version could be:
 *
 * ```markdown
 * export const namelink = mdx`[[{props.name}]]`
 *
 * Authors: {namelink({name: "Peter")}} and {namelink({name: "Paul")}}
 * ```
 *
 * For this to work, the `mdx` tagged literal function must return a sync value
 * which can be invoked directly. Unfortunately, MDX compilation is async.
 *
 * To work around this, the `mdx` tagged literal function could return a
 * function which invokes a the stored resolved value of the mdx compilation.
 * Since the MDX-compiler generated javascript is evaluated before any MDX
 * content can be rendered, any top-level exports from the MDX may be awaited
 * upon if necessary during the async mdx compilation & evaluation stage.
 *
 * By the time the function returned by the `mdx` tagged literal function is
 * invoked, the compilation process for the MDX source will have completed.
 *
 * Note that this does not solve non-top-level export uses of `mdx`, eg:
 * ```markdown
 * # non top level
 * {mdx`*hello*`}
 * ```
 * In this case the function returned will be immediately invoked and the
 * corresponding MDX source will not be compiled yet.
 *
 * # 4. Dynamically invoke MDX imported from another tiddler
 * Just like case 3, but via `import`.
 */

export const getMdxTagFn = ({
  loader,
  moduleLoaderContext
}: {
  loader: MDXModuleLoader,
  moduleLoaderContext: ModuleLoaderContext
}) => (stringParts: string[], ...literalBoundValues: any[]): CompiledMDXLiteral => {
  const mdxContent = constructMDXContent(stringParts);
  const compilationResultPromise = loader.evaluateMDX({
    mdx: mdxContent,
    moduleLoaderContext,
    boundProps: {literalBoundValues}
  });
  // save compilation result promise to cache entry
  if (!moduleLoaderContext.mdxLiteralCompilationResults) {
    moduleLoaderContext.mdxLiteralCompilationResults = [];
  }
  // save the cacheEntry to moduleLoaderContext.mdxLiteralCompilationCache so
  // all of these literals' compilation can be awaited before the entire MDX
  // module is ready.
  let returnValue:CompiledMDXLiteral|undefined = undefined;
  const mdxLiteralIndex = moduleLoaderContext.mdxLiteralCompilationResults.push(compilationResultPromise);
  const componentPromise = compilationResultPromise.then(
    result => {
      const component:CompiledMDXLiteral = wrapMDXComponent(result, moduleLoaderContext.mdxContext.definingTiddlerTitle);
      if (returnValue) {
        returnValue.compilationResult = result;
        if ('moduleExports' in result) {
          returnValue.exports = result.moduleExports;
        }
      }
      return component;
    },
    // The compiler shouldn't reject promises, it should include any error
    // in the resolved result, but just to be safe:
    err => {
      const component = () => JSError({
        error: err as Error,
        title: `Error compiling MDX literal number ${mdxLiteralIndex}`,
      });
      return component;
    }
  );

  returnValue = withAsyncComponent(componentPromise);
  return returnValue;
}
