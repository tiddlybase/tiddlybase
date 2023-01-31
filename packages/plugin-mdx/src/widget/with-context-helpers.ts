import { TW5ReactContext } from "@tiddlybase/plugin-react/src/components/TW5ReactContext";
import { FunctionComponent, useContext } from "react";

export const withContextHelpers = (Component:FunctionComponent<any>, definingTiddlerTitle?:string) => (props:any) => {
  const context = useContext(TW5ReactContext);
  let extendedProps = props;
  if (context) {
    extendedProps = {
      ...props,
      context,
      get currentTiddler() {
        return context.parentWidget?.wiki?.getTiddler(
          context.parentWidget?.getVariable("currentTiddler")
        );
      },
      get definingTiddler() {
        return !!definingTiddlerTitle
          ? context.parentWidget?.wiki?.getTiddler(definingTiddlerTitle)
          : undefined;
      },
    }
  }
  return Component(extendedProps);
}
