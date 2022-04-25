import { BaseWidget } from "@tiddlybase/plugin-tiddlybase-utils/src/base-widget";
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';

type Component = Parameters<Root["render"]>[0];

export class ReactBaseWidget<PropType> extends BaseWidget<PropType> {

  domNode?: HTMLElement
  root?: Root;
  component?: Component;

  unmount() {
    if (this.root) {
      this.root.unmount();
    }
  }

  getComponent():Component {
    return createElement('span', null, 'please override ReactBaseWidget.getComponent()');
  }

  initReact() {
    this.domNode = this.domNode ?? this.document.createElement('div');
    this.root = this.root ?? createRoot(this.domNode);
    this.component = this.getComponent();
    return this.domNode;
  }

  getDOMNode() {
    if (!this.domNode) {
      this.initReact();
      console.log("rendering component");
      this.root?.render(this.component!);
    }
    return this.domNode!;
  }

  removeChildDomNodes(): void {
    this.unmount();
    this.domNode = undefined;
    super.removeChildDomNodes();
  }

}
