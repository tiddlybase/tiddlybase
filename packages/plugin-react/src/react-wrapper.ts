import { monitorRemoval, RemovalHandler, unmonitorRemoval } from "@tiddlybase/plugin-react/src/tiddler-removal-detector";
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { JSError } from "./components/JSError";
import { withContextProvider } from "@tiddlybase/plugin-react/src/components/TW5ReactContext";
import { ReactNode } from "react";
import type {} from "@tiddlybase/tw5-types/src/index"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { widget } = require('$:/core/modules/widgets/widget.js');

// insane webpack dynamic require trick: https://stackoverflow.com/a/53074814
declare var __webpack_require__: Function;
declare var __non_webpack_require__: Function;
const requireFunc = typeof __webpack_require__ === "function" ? __non_webpack_require__ : require;

export type ExtraProps = Record<string, string>;

export type ReactWrapperProps = {
  module: string,
  export?: string
} & ExtraProps

export type WrappedPropsBase = {
  parentWidget?: $tw.Widget,
  children?: ReactNode
}

const errorMsg = (message: string, title?:string) => JSError({
  title: title ?? 'Error rendering react component',
  error: { name: 'react-wrapper-error', message }
});

export class ReactWrapper extends (widget as typeof $tw.Widget) {

  root?: Root;
  renderable?: Promise<ReactNode>;
  onRemovalHandler:RemovalHandler|undefined = undefined;

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
      return JSError({
        title: 'Module require error',
        error: Object.assign({}, e as Error)
      });
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
      const Component = isFactory ? await exportValue({parentWidget: this, ...props}) : exportValue;
      return withContextProvider({
        context: {parentWidget: this},
        Component,
        props
      })
    } catch (e) {
      return JSError({error: e as Error});
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
    this.getRenderable().then((renderable: ReactNode) => this.initReact(renderable, domNode));
    // Insert element
    parent.insertBefore(domNode, nextSibling);
    this.domNodes = [domNode];

  }

  getContainingTiddlerTitle():string|null {
    let element:HTMLElement|null = this.parentDomNode;
    while (element) {
      const tiddlerTitleAttribute = element.getAttribute('data-tiddler-title');
      if (tiddlerTitleAttribute) {
        return tiddlerTitleAttribute;
      }
      element = element.parentElement;
    }
    return null;
  }

  destroy() {
    const tiddlerTitle = this.getContainingTiddlerTitle();
    if (tiddlerTitle) {
      unmonitorRemoval(tiddlerTitle)
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

  async initReact(renderable: ReactNode, domNode: HTMLElement) {
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
    if (!this.onRemovalHandler) {
      const tiddlerTitle = this.getContainingTiddlerTitle();
      if (tiddlerTitle) {
        this.onRemovalHandler = (event:$tw.Widget.WidgetEvent) => {
          console.log("widget removed, unmounting");
          this.destroy();
          return true;
        }
        monitorRemoval(tiddlerTitle, this.onRemovalHandler);
      }
    }
  }

  refresh(changedTiddlers: $tw.ChangedTiddlers): boolean {
    var changedAttributes = this.computeAttributes();
    let selfRefreshed = false;
    if (Object.keys(changedAttributes).length > 0) {
      console.log("attributes changed, rerendering component")

      // force rerender
      this.getRenderable().then((renderable: ReactNode) => this.initReact(renderable, this.domNodes[0]));
      selfRefreshed = true;
    }
    // Widget children may be affected by changes, so push refresh down.
    const childrenRefreshed = this.refreshChildren(changedTiddlers);
    return selfRefreshed || childrenRefreshed;
  };

}
