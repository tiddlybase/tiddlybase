import { useContext } from "react";
import { TW5ReactContext } from "@tiddlybase/plugin-react/src/components/TW5ReactContext";

export const LogContext = () => {
  const value = useContext(TW5ReactContext);
  console.log("context is", value);
  return "context has been logged";
}
