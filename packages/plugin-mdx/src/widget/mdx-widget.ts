import { ReactBaseWidget } from "@tiddlybase/plugin-react/src/react-base-widget";
import { compile, getComponent } from "@tiddlybase/plugin-mdx/src/mdx-client/mdx-client";
import { MDXProps } from "./mdx-props";
import { MDXLayout, MDXLayoutArgs } from "./components/MDXLayout";
import { LogContext } from "./components/LogContext";
import { TranscludeTiddler } from "./components/TranscludeTiddler";
import type { Widget, ChangedTiddlers } from '@tiddlybase/tw5-types';
import { WidgetWithExternalChildren } from "./components/WidgetWithExternalChildren";

const components = {
  wrapper: MDXLayout,
  LogContext,
  TranscludeTiddler
};

class MDXWidget extends ReactBaseWidget<MDXProps> implements WidgetWithExternalChildren{

  externalChildren = new Set<Widget>([]);

  addExternalChild (child: Widget) {
    this.externalChildren.add(child);
  }

  removeExternalChild (child: Widget) {
    this.externalChildren.delete(child);
  }

  getComponent() {
    const context = {
      getVariable: this.getVariable.bind(this),
      wiki: this.wiki
    }
    const contextKeys:string[] = Object.keys(context).sort();
    const contextValues:any[] = contextKeys.reduce((acc, key) => {
      acc.push((context as any)[key])
      return acc;
    }, [] as any[]);
    const compiledFn = compile(
      this.getPropAttribute('name') ?? 'TODOmdx',
      this.getPropAttribute('mdx') ?? '',
      contextKeys);
    const importFn = require;
    const additionalProps:MDXLayoutArgs = {
      parent: this
    };
    return getComponent(compiledFn, importFn, components, contextValues, additionalProps);
  }

  refreshChildren(changedTiddlers: ChangedTiddlers): boolean {
    super.refreshChildren(changedTiddlers);
    return [...this.externalChildren].map(child => child.refresh(changedTiddlers)).reduce((acc, ret) => acc || ret, false);
  }

}

export { MDXWidget as MDX};
