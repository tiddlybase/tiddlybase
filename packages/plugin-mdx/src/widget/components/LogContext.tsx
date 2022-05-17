import { useContext } from "react";
import { WidgetParentContext } from "@tiddlybase/plugin-react/src/components/WidgetContext";

export const LogContext = () => {
  const value = useContext(WidgetParentContext);
  console.log("context is", value);
  return "context has been logged";
}
