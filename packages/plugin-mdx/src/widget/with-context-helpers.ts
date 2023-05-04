import { TW5ReactContext } from "@tiddlybase/plugin-react/src/components/TW5ReactContext";
import { FunctionComponent, useContext } from "react";

export const withContextHelpers = (
  Component: FunctionComponent<any>,
  components?: Record<string, any>,
  boundProps?: Record<string, any>) => {
  const newComponent = (props: any) => {
    const propsWithDefaults = {
      // if bound props are provided, always pass them to the component
      ...(boundProps ?? {}),
      // they can be overridden by the actual props passed by the caller
      ...props,
      // components is a special case: those passed in must be merged with
      // defaults available at compile time.
      components: { ...(components), ...(props?.components) },
    }
    const context = useContext(TW5ReactContext);

    let propsWithContext = propsWithDefaults;
    if (context) {
      propsWithContext = {
        ...propsWithDefaults,
        context
      }
    }
    return Component(propsWithContext);
  };
  // save original unwrapped component debugging purposes
  newComponent.original = Component;
  return newComponent
}
