import { CompilationResult, MDXModuleLoader, ModuleLoaderContext } from "../mdx-module-loader";

import React from "react";
import { mdxModuleLoader } from "../global";
import { compiledMDXToReactComponent } from "../mdx-util";


export const constructMDXContent = (stringParts: string[], values:any[]):string => stringParts.reduce(
  (content, part, partIx) => {

    return `${content}\n${part}\n{props.values[${partIx}]}\n`
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
 * to `namelink()` will still result in a call to the compiler.
 *
 * ```markdown
 * export const namelink = mdx`[[{props.name}]]`
 *
 * Authors: {namelink({name: "Peter")}} and {namelink({name: "Paul")}}
 * ```
 *
 * For this to work, the `mdx` tagged literal function must return a sync value
 * which can be invoked directly. Unfortunately, MDX compilation is async.
 * Since the
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
 * {(() => mdx`*content*`)()}
 * ```
 * In this case the function returned will be immediately invoked and the
 * corresponding MDX source will not be compiled yet.
 *
 * # 4. Dynamically invoke MDX imported from another tiddler
 * Just like case 3, but via `import`.
 */

export const getMdxTagFn = ({
  loader=mdxModuleLoader,
  moduleLoaderContext
}:{
  loader?:MDXModuleLoader,
  moduleLoaderContext?: ModuleLoaderContext
}={}) => (stringParts: string[], ...values:any[]):(props:any) => React.ReactNode => {
  const mdxContent = constructMDXContent(stringParts, values);
  // useState creates a place to store async result of MDX compilation
  const [compilationResult, setCompilationResult] = React.useState<CompilationResult|null>(null);
  // useEffect triggers MDX compilation exactly once on intial component render
  React.useEffect(() => {
    loader.evaluateMDX({
      mdx: mdxContent,
      moduleLoaderContext
    }).then(
      setCompilationResult,
      error => {
        setCompilationResult({
          mdx: mdxContent,
          errorTitle: "getMdxTagFn: unexpected error thrown compiling dynamic mdx",
          error,
          // fake ModuleLoaderContext so error can be stored as a CompilationResult
          loadContext: {} as ModuleLoaderContext
        })
      }
    );
  }, [])
  // display compiled MDX's default export or error message if available
  if (!compilationResult) {
    return () => "compiling MDX..."
  } // else
  return compiledMDXToReactComponent(compilationResult);
}
