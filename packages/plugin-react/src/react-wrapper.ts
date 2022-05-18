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

export type ExtraProps = Record<string,string>;

export type ReactWrapperProps = {
  module:string,
  export?:string,
} & ExtraProps

export type WrappedPropsBase = {
  require: (id: string) => any,
  parentWidget: Widget,
  children: ReactRenderable | null
}

export class ReactWrapper extends WidgetClass implements Widget{

  root?: Root;
  renderable?: ReactRenderable;

  execute() {
    // initialize react component
    const {module: moduleName, export: exportName = 'default', ...props} = this.attributes as ReactWrapperProps;
    if (!moduleName) {
      this.renderable = ReactWrapperError({message: 'Must set "module" widget attribute.'});
      return;
    }

    if (!exportName) {
      this.renderable = ReactWrapperError({message: 'Must set "export" widget attribute.'});
      return;
    }
    let module;
    try {
      module = requireFunc(moduleName);
    } catch (e) {
      if ((e as any)?.code === 'MODULE_NOT_FOUND') {
        this.renderable = ReactWrapperError({message: `The module '${moduleName}' could not be found.`})
      } else {
        this.renderable = ReactWrapperError({message: `require error: ${String(e)}`})
      }
      return;
    }
    const exportValue = module[exportName];
    if (exportValue === undefined) {
      this.renderable = ReactWrapperError({message: `The module's '${exportName}' module undefined.`});
      return;
    }
    try {
      this.renderable = renderWithContext({
        parentWidget: this,
        children: createElement(exportValue, {...props, require: requireFunc, parentWidget: this}, null)
      })
    } catch (e) {
      this.renderable = ReactWrapperError({message: `Error rendering component '${exportName}': ${String(e)}`})
    }
  }

  render(parent: HTMLElement, nextSibling: HTMLElement) {
    // save parent DOM node
    this.parentDomNode = parent;
    // copy attribute values to this.attributes
    this.computeAttributes();
    this.execute();
    // if child DOM node already exists, destroy it first
    if (this.domNodes?.length > 0) {
      this.removeChildDomNodes();
    }
    const domNode = this.document.createElement('div');
    this.initReact(domNode);
    // Insert element
    parent.insertBefore(domNode, nextSibling);
    this.domNodes = [domNode];
    monitorRemoval(domNode, () => {
        console.log("widget root DOM element orphaned, unmounting");
        this.destroy();
    });
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

  initReact(domNode:HTMLElement) {
    // silently do nothing if render() hasn't been called yet.
    if (!domNode) {
      return;
    }
    if (!this.root) {
      this.root = createRoot(domNode);
    }
    if (this.renderable) {
      this.root.render(this.renderable)
    }
  }

  refresh(changedTiddlers: ChangedTiddlers):boolean {
    var changedAttributes = this.computeAttributes();
    let selfRefreshed = false;
    if (Object.keys(changedAttributes).length > 0) {
        console.log("attributes changed, rerendering component")
        // recreate component
        this.execute()
        // force rerender
        this.initReact(this.domNodes[0]);
        selfRefreshed = true;
    }
    // Widget children may be affected by changes, so push refresh down.
    const childrenRefreshed = this.refreshChildren(changedTiddlers);
    return selfRefreshed || childrenRefreshed;
  };

}
