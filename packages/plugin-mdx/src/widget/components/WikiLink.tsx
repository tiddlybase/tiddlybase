import { useContext } from "react";
import { TW5ReactContext } from "@tiddlybase/plugin-react/src/components/TW5ReactContext";
import { errorMsg } from "@tiddlybase/plugin-react/src/components/JSError";
import { makeWikiLink } from "./tw5-utils";

export interface WikiLinkProps {
  targetTiddler: string,
  children?: React.ReactNode
}

export const WikiLink = ({targetTiddler, children}: WikiLinkProps) => {
  const context = useContext(TW5ReactContext);
  if (context === null) {
    return errorMsg('Cannot create WikiLink component without a TW5ReactContext');
  }
  return makeWikiLink(context, targetTiddler, children)
}
