import { monitorRemoval, unmonitorRemoval } from "@tiddlybase/plugin-react/src/dom-removal-detector";
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import type { ChangedTiddlers } from "@tiddlybase/tw5-types";
import type { Widget, WidgetConstructor } from '@tiddlybase/tw5-types';
import { ReactWrapperError } from "./components/error";
import { ReactRenderable } from "./react-widget-types";
import { renderWithContext } from "./components/WidgetContext";


// eslint-disable-next-line @typescript-eslint/no-var-requires
const { widget } = require('$:/core/modules/widgets/widget.js');

// insane webpack dynamic require stuff: https://stackoverflow.com/a/53074814
declare var __webpack_require__: Function;
declare var __non_webpack_require__: Function;
const requireFunc = typeof __webpack_require__ === "function" ? __non_webpack_require__ : require;

const WidgetClass: WidgetConstructor = widget;

export type ExtraProps = Record<string, string>;

export type ReactWrapperProps = {
  module: string,
  export?: string,
} & ExtraProps

export type WrappedPropsBase = {
  require: (id: string) => any,
  parentWidget: Widget,
  children: ReactRenderable | null
}

const errorMsg = (message: string) => ReactWrapperError({ message });

export class ReactWrapper extends WidgetClass implements Widget {

  root?: Root;
  renderable?: Promise<ReactRenderable>;

  async getRenderable() {
    // initialize react component
    const { module: moduleName, export: exportName = 'default', ...props } = this.attributes as ReactWrapperProps;
    if (!moduleName) {
      return errorMsg('Must set "module" widget attribute.');
    }

    if (!exportName) {
      return errorMsg('Must set "export" widget attribute.');
    }
    let module;
    try {
      // the require function is sync, so module will always be a value (not a promise),
      // but it may be a factory which will return a promise to a component
      module = requireFunc(moduleName);
    } catch (e) {
      if ((e as any)?.code === 'MODULE_NOT_FOUND') {
        return errorMsg(`The module '${moduleName}' could not be found.`)
      }
      return errorMsg(`require error: ${String(e)}`)
    }
    const exportValue = module[exportName];
    if (exportValue === undefined) {
      return errorMsg(`The module's '${exportName}' module undefined.`);
    }
    let isFactory = false;
    if (exportName.endsWith("Factory")) {
      console.log(`react-wrapper: considering export ${exportName} a factory`);
      isFactory = true;
    }
    try {
      const component = isFactory ? await exportValue({require: requireFunc, parentWidget: this, ...props}) : exportValue;
      return renderWithContext({
        parentWidget: this,
        children: createElement(component, props)
      })
    } catch (e) {
      return errorMsg(`Error rendering component '${exportName}': ${String(e)}`);
    }
  }

  render(parent: HTMLElement, nextSibling: HTMLElement) {
    // save parent DOM node
    this.parentDomNode = parent;
    // copy attribute values to this.attributes
    this.computeAttributes();
    // if child DOM node already exists, destroy it first
    if (this.domNodes?.length > 0) {
      this.removeChildDomNodes();
    }
    const domNode = this.document.createElement('div');
    this.getRenderable().then((renderable: ReactRenderable) => this.initReact(renderable, domNode, true));
    // Insert element
    parent.insertBefore(domNode, nextSibling);
    this.domNodes = [domNode];

  }

  destroy() {
    if (this.domNodes[0]) {
      unmonitorRemoval(this.domNodes[0])
    }
    if (this.root) {
      this.root.unmount();
    }
    this.root = undefined;
  }

  removeChildDomNodes() {
    // unmount React Root before destroying DOM nodes.
    this.destroy();
    // also notifies child TW5 widgets
    super.removeChildDomNodes();
  }

  async initReact(renderable: ReactRenderable, domNode: HTMLElement, addRemovalMonitor = false) {
    if (!domNode) {
      // silently do nothing if render() hasn't been called yet.
      return;
    }
    if (!this.root) {
      this.root = createRoot(domNode);
    }
    if (renderable) {
      this.root.render(renderable)
    }
    if (addRemovalMonitor) {
      monitorRemoval(domNode, () => {
        console.log("widget root DOM element orphaned, unmounting");
        this.destroy();
      });
    }
  }

  refresh(changedTiddlers: ChangedTiddlers): boolean {
    var changedAttributes = this.computeAttributes();
    let selfRefreshed = false;
    if (Object.keys(changedAttributes).length > 0) {
      console.log("attributes changed, rerendering component")

      // force rerender
      this.getRenderable().then((renderable: ReactRenderable) => this.initReact(renderable, this.domNodes[0]));
      selfRefreshed = true;
    }
    // Widget children may be affected by changes, so push refresh down.
    const childrenRefreshed = this.refreshChildren(changedTiddlers);
    return selfRefreshed || childrenRefreshed;
  };

}
