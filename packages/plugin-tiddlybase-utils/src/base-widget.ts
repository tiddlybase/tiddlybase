// from:
// https://tiddlywiki.com/dev/static/Using%2520ES2016%2520for%2520Writing%2520Plugins.html
// https://webpack.js.org/configuration/resolve/#resolvefallback
// https://github.com/basarat/typescript-book/blob/master/docs/project/external-modules.md

import type { } from "@tiddlybase/tw5-types"
import type { ParseTree, Widget, WidgetConstructor } from '@tiddlybase/tw5-types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { widget } = require('$:/core/modules/widgets/widget.js');

const WidgetClass: WidgetConstructor = widget;
export class BaseWidget<PropType> extends WidgetClass implements Widget {

  props?: PropType;

  constructor(parseTreeNode: ParseTree, options: any) {
    super(parseTreeNode, options);
  }

  getDOMNode(parent?: HTMLElement, nextSibling?: HTMLElement):HTMLElement {
    // Override this
    const div = this.document.createElement('div')
    div.innerHTML = 'please override BaseWidget.getDOMNode()'
    console.log('called BaseWidget.getDOMNode with props', this.props);
    return div;
  }

  render(parent: HTMLElement, nextSibling: HTMLElement) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    const domNode = this.getDOMNode(parent, nextSibling)
    // Insert element
    parent.insertBefore(domNode, nextSibling);
    this.domNodes.push(domNode);
  }

  getPropAttribute(attribute:keyof PropType) {
    return super.getAttribute(String(attribute));
  }

  execute() {
    // NOTE: override execute if some attributes aren't string and must
    // be converted / cast.
    this.props = this.attributes as unknown as PropType;
  };


  refresh() {
    var changedAttributes = this.computeAttributes() as unknown as Partial<Record<keyof PropType, boolean>>;
    // default is to refresh if any attribute changed
    if (Object.keys(changedAttributes).length > 0) {
      this.refreshSelf();
      return true;
    } else {
      return false;
    }
  };

}
