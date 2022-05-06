import { BaseWidget } from "@tiddlybase/plugin-tiddlybase-utils/src/base-widget";
import { monitorRemoval } from "@tiddlybase/plugin-tiddlybase-utils/src/dom-removal-detector";
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';

type Component = Parameters<Root["render"]>[0];

export class ReactBaseWidget<PropType> extends BaseWidget<PropType> {

  domNode?: HTMLElement
  root?: Root;
  component?: Component;

  destroy() {
    if (this.domNode && this.domNode.parentElement) {
      this.domNode.parentElement.removeChild(this.domNode);
    }
    this.domNode = undefined;
    if (this.root) {
      this.root.unmount();
    }
    this.root = undefined;
  }

  getComponent():Component {
    return createElement('span', null, 'please override ReactBaseWidget.getComponent()');
  }

  initReact() {
    this.domNode = this.domNode ?? this.document.createElement('div');
    this.root = this.root ?? createRoot(this.domNode);
    this.component = this.component ?? this.getComponent();
    return this.domNode;
  }

  reactRender() {
    if (this.component) {
      this.root?.render(this.component);
    }
  }

  onPostDomInsert() {
    if (this.domNode) {
      monitorRemoval(this.domNode, () => {
        console.log("root element orphaned, unmounting");
        this.destroy();
      });
    }
  }

  getDOMNode() {
    if (!this.domNode) {
      this.initReact();
      this.reactRender();
    }
    return this.domNode!;
  }

  removeChildDomNodes(): void {
    super.removeChildDomNodes();
    this.destroy();
  }

}
