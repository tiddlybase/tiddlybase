import { useContext } from "react";
import { TW5ReactContext } from "@tiddlybase/plugin-react/src/components/TW5ReactContext";
import { errorMsg } from "@tiddlybase/plugin-react/src/components/JSError";
import { NavigationEventHandler, makeWikiLink } from "./tw5-utils";

export interface WikiLinkProps {
  tiddler: string,
  onClick?: NavigationEventHandler,
  children?: React.ReactNode
}

export const WikiLink = ({tiddler, children, onClick}: WikiLinkProps) => {
  const context = useContext(TW5ReactContext);
  if (context === null) {
    return errorMsg('Cannot create WikiLink component without a TW5ReactContext');
  }
  return makeWikiLink(context, tiddler, children, onClick)
}
