import {
  compile,
  getExports,
} from "@tiddlybase/plugin-mdx/src/mdx-client/mdx-client";
import { components } from "./components/TW5Components";
import type { WrappedPropsBase } from "@tiddlybase/plugin-react/src/react-wrapper";
import {} from "@tiddlybase/tw5-types";

export type MDXFactoryProps = WrappedPropsBase & {
  mdx: string;
  name?: string;
};

export type MDXMetadata = {
  dependencies: string[];
};

let invocationCounter = 0;

export const MDXFactory = async ({
  parentWidget,
  children,
  require,
  mdx,
  name,
}: MDXFactoryProps) => {
  const definingTiddlerName:string|undefined = name ?? parentWidget?.getVariable("currentTiddler");
  if (children) {
    console.log("MDX ignoring children", children);
  }
  const mdxContext = {
    wiki: parentWidget?.wiki ?? $tw.wiki,
  };
  const contextKeys: string[] = Object.keys(mdxContext).sort();
  const contextValues: any[] = contextKeys.reduce((acc, key) => {
    acc.push((mdxContext as any)[key]);
    return acc;
  }, [] as any[]);
  const mdxMetadata: MDXMetadata = {
    dependencies: [],
  };
  const importFn = async (mdxTiddlerName: string) => {
    // To require() a module, it must have been registered with TiddlyWiki
    // either at boot time (js modules) or because MDX has already compiled and
    // registered the generated module with TiddlyWiki. For MDX dependencies,
    // compile them now so they can be required if necessary
    if (
      mdxTiddlerName &&
      !(mdxTiddlerName in $tw.modules.titles) &&
      $tw.wiki.getTiddler(mdxTiddlerName)?.fields?.type === "text/x-markdown"
    ) {
      // called so the module is registered
      await MDXFactory({
        parentWidget,
        children: null,
        require: (title) => $tw.modules.execute(title, definingTiddlerName),
        mdx: $tw.wiki.getTiddler(mdxTiddlerName)?.fields.text ?? "",
        name: mdxTiddlerName,
      });
    }
    mdxMetadata.dependencies.push(mdxTiddlerName);
    return require(mdxTiddlerName);
  };
  const compiledFn = await compile(
    definingTiddlerName ?? `$:/mdx_generated_${invocationCounter++}`,
    mdx,
    contextKeys
  );
  const mdxExports = await getExports(
    compiledFn,
    importFn,
    components,
    contextValues
  );
  mdxExports.mdxMetadata = mdxMetadata;
  if (definingTiddlerName) {
    $tw.modules.define(definingTiddlerName, "library", mdxExports);
  }
  return (props: any) => {
    console.log("running default");
    return mdxExports.default({ ...props, components })
  };
};
