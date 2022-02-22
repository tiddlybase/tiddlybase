// from:
// https://tiddlywiki.com/dev/static/Using%2520ES2016%2520for%2520Writing%2520Plugins.html
// https://webpack.js.org/configuration/resolve/#resolvefallback
// https://github.com/basarat/typescript-book/blob/master/docs/project/external-modules.md

import type { } from "@firebase-auth-loader/tw5-types"
import type { ExtendedTW } from "@firebase-auth-loader/child-iframe/src/addParentClient";
import type { ParseTree, Widget, WidgetConstructor } from '@firebase-auth-loader/tw5-types';
import { getDomNode } from "./helper";
import { StorageFileProps } from "./props";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { widget } = require('$:/core/modules/widgets/widget.js');
const parentClient = ($tw as ExtendedTW).parentClient!;

const WidgetClass: WidgetConstructor = widget;
class StorageFile extends WidgetClass implements Widget {

  private props?: StorageFileProps;

  constructor(parseTreeNode: ParseTree, options: any) {
    super(parseTreeNode, options);
  }

  render(parent: HTMLElement, nextSibling: HTMLElement) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    const domNode = getDomNode(
      this.document,
      parentClient('getDownloadURL', [this.props!.src]),
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
      tooltip: this.getAttribute("tooltip"),
      alt: this.getAttribute("alt")
    }
  };


  refresh() {
    var changedAttributes = this.computeAttributes();
    if (changedAttributes.src || changedAttributes.width || changedAttributes.height || changedAttributes["class"] || changedAttributes.tooltip) {
      this.refreshSelf();
      return true;
    } else {
      return false;
    }
  };

}

export { StorageFile as storageFile };
