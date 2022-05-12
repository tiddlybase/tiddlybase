import { BaseWidget } from "@tiddlybase/plugin-tiddlybase-utils/src/base-widget";
import { monitorRemoval, unmonitorRemoval } from "@tiddlybase/plugin-react/src/dom-removal-detector";
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import type { ChangedTiddlers } from "@tiddlybase/tw5-types";

type Component = Parameters<Root["render"]>[0];

export class ReactBaseWidget<PropType> extends BaseWidget<PropType> {

  domNode?: HTMLElement
  root?: Root;
  component?: Component;

  destroy() {
    if (this.domNode) {
      unmonitorRemoval(this.domNode)
      this.domNode.parentElement?.removeChild(this.domNode);
    }
    this.domNode = undefined;
    if (this.root) {
      this.root.unmount();
    }
    this.root = undefined;
  }

  render(parent: HTMLElement, nextSibling: HTMLElement) {
    // render() called by parent, we're getting a new DOM container
    // destroy existing one.
    if (this.domNode) {
      this.destroy();
    }
    // calls back into BaseWidget.render() which ultimately calls initReact()
    super.render(parent, nextSibling);
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
      console.log("invoking react render fn");
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

  refresh(changedTiddlers: ChangedTiddlers):boolean {
    var changedAttributes = this.computeAttributes();
    if (Object.keys(changedAttributes).length > 0) {
        console.log("attributes changed, rerendering component")
        // recreate component
        this.component = this.getComponent();
        // force rerender
        this.reactRender();
        return true;
    }
    // no changed, but push refresh down to children.
    return this.refreshChildren(changedTiddlers);
  };

}
