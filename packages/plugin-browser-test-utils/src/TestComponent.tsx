import type { Widget } from "@tiddlybase/tw5-types/src";

// duplicating type { ExtraProps, WrappedPropsBase } from "@tiddlybase/plugin-react/src/react-wrapper"
// to void circular deps
type WrappedPropsBase = {
  parentWidget: Widget,
  children: any
}
type ExtraProps = Record<string, string>;

export type Props = WrappedPropsBase & ExtraProps;
export type RenderCallback = (props: Props) => void;

let renderCallbacks: RenderCallback[] = [];

export const TestComponent = (props: Props) => {
  const { parentWidget, require, ...extraProps } = props;
  renderCallbacks.forEach((cb) => cb(props));
  return (
    <pre>{JSON.stringify(extraProps, Object.keys(extraProps).sort())}</pre>
  );
};

export const clearCallbacks = () => {
  renderCallbacks = [];
};

export const addCallback = (cb: RenderCallback) => {
  renderCallbacks.push(cb);
};
