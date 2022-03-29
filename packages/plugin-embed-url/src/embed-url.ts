// from:
// https://tiddlywiki.com/dev/static/Using%2520ES2016%2520for%2520Writing%2520Plugins.html
// https://webpack.js.org/configuration/resolve/#resolvefallback
// https://github.com/basarat/typescript-book/blob/master/docs/project/external-modules.md

import type { } from "@tiddlybase/tw5-types"
import type { ParseTree, Widget, WidgetConstructor } from '@tiddlybase/tw5-types';
import { getDomNode } from "./helper";
import { EmbedURLProps } from "./props";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { widget } = require('$:/core/modules/widgets/widget.js');

const WidgetClass: WidgetConstructor = widget;
class EmbedURL extends WidgetClass implements Widget {

  private props?: EmbedURLProps;

  constructor(parseTreeNode: ParseTree, options: any) {
    super(parseTreeNode, options);
  }

  render(parent: HTMLElement, nextSibling: HTMLElement) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    const domNode = getDomNode(
      this.document,
      this.props!)
    // Insert element
    parent.insertBefore(domNode, nextSibling);
    this.domNodes.push(domNode);
  }


  execute() {
    // Get our parameters
    this.props = {
      src: this.getAttribute("src"),
      width: this.getAttribute("width"),
      height: this.getAttribute("height"),
      description: this.getAttribute("description"),
      attributes: this.getAttribute("attributes")
    }
  };


  refresh() {
    var changedAttributes = this.computeAttributes() as unknown as EmbedURLProps;
    if (changedAttributes.src || changedAttributes.width || changedAttributes.height || changedAttributes.description || changedAttributes.attributes) {
      this.refreshSelf();
      return true;
    } else {
      return false;
    }
  };

}

export { EmbedURL};
