import { useState, useEffect, ComponentType } from "react";
import { JSError } from "./JSError";

const DEFAULT_LOAD_MESSAGE = () => <>loading...</>;

// Content is a ReactNode, a Promise resolving to a ReactNode or an (async) function returning a ReactNode.
export type AsyncComponent<P> =
  | Promise<ComponentType<P>> // promise to a component
  | (() => Promise<ComponentType<P>>) // async function producing component

export const withAsyncComponent = <P = {}>(
  asyncComponent: AsyncComponent<P>,
  loadMessage?: ComponentType<P>
) => {
  const WithAsyncComponent:ComponentType<P> = (props:P) => {
    const [rejectionCause, setRejectionCause] = useState<any>(null);
    // put the component in an object property so useState doesn't invoke it
    // mistaking it for a state update function
    const [resolvedValue, setResolvedValue] = useState<{fn: ComponentType<P>} | null>(null);
    useEffect(() => {
      Promise.resolve(typeof asyncComponent === "function" ? asyncComponent() : asyncComponent).then(
        resolved => {
          setResolvedValue({fn: resolved});
        },
        setRejectionCause
      );
    }, []);
    let Component = loadMessage ?? DEFAULT_LOAD_MESSAGE;
    if (rejectionCause !== null) {
      Component = () => JSError({
        title: "Error resolving promise",
        error: rejectionCause,
      })
    }
    if (resolvedValue !== null) {
      Component = resolvedValue.fn
    }
    // props as any added because tsc complained:
    // This type parameter might need an `extends JSX.IntrinsicAttributes` constraint.
    return <Component {...(props as any)} />;
  }
  WithAsyncComponent.displayName = `WithAsyncComponent`;
  return WithAsyncComponent;
};
