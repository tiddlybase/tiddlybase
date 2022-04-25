import { ReactBaseWidget } from "@tiddlybase/plugin-react/src/react-base-widget";
import { compile, getComponent } from "@tiddlybase/plugin-mdx/src/mdx-client/mdx-client";
import { MDXProps } from "./mdx-props";

class MDXWidget extends ReactBaseWidget<MDXProps> {

  getComponent() {
    const compiledFn = compile('TODOmdx', this.getPropAttribute('mdx') ?? '');
    const components = {/* TODO */};
    const importFn = require;
    return getComponent(compiledFn, importFn, components);
  }

}

export { MDXWidget as MDX};
