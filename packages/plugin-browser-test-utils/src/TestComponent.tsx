/// <reference types="@tiddlybase/tw5-types/src/tiddlybase" />
// duplicating type { ExtraProps, WrappedPropsBase } from "@tiddlybase/plugin-react/src/react-wrapper"
// to void circular deps
type WrappedPropsBase = {
  parentWidget: $tw.Widget,
  children: any
}
type ExtraProps = Record<string, string>;

export type Props = WrappedPropsBase & ExtraProps;
export type RenderCallback = (props: Props) => void;

let renderCallbacks: RenderCallback[] = [];

export const TestComponent = (props: Props) => {
  const { parentWidget, ...extraProps } = props;
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
