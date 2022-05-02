import { useContext } from "react";
import { TW5WidgetParentContext } from "./TW5WidgetParentContext";

export const LogContext = () => {
  const value = useContext(TW5WidgetParentContext);
  console.log("context is", value);
  return "context has been logged";
}
