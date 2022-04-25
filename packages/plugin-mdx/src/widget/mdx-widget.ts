// from:
// https://tiddlywiki.com/dev/static/Using%2520ES2016%2520for%2520Writing%2520Plugins.html
// https://webpack.js.org/configuration/resolve/#resolvefallback
// https://github.com/basarat/typescript-book/blob/master/docs/project/external-modules.md

import { BaseWidget } from "@tiddlybase/plugin-tiddlybase-utils/src/base-widget";
import { compile, renderToDOM, getComponent } from "@tiddlybase/plugin-mdx/src/mdx-client/mdx-client";
import { MDXProps } from "./mdx-props";


class MDXWidget extends BaseWidget<MDXProps> {

  getDOMNode(parent?: HTMLElement, nextSibling?: HTMLElement): HTMLElement {
    const compiledFn = compile('TODOmdx', this.props?.mdx ?? '');
    const components = {/* TODO */};
    const importFn = require;
    const container = this.document.createElement('div');
    renderToDOM(
      getComponent(compiledFn, importFn, components),
      container
    );
    return container;
  }

}

export { MDXWidget as MDX};
