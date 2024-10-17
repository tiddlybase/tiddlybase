import { useContext, useCallback } from "react";
import { TW5ReactContext } from "@tiddlybase/plugin-react/src/components/TW5ReactContext";
import { errorMsg } from "@tiddlybase/plugin-react/src/components/JSError";
import {
  NavigationEventHandler,
  getWikiLinkProps,
  makeLinkClickHandler,
} from "./tw5-utils";

export interface WikiLinkProps
  extends React.DetailedHTMLProps<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    HTMLAnchorElement
  > {
  tiddler: string;
  onNavigate?: NavigationEventHandler;
}

export const WikiLink = ({
  tiddler,
  children,
  onNavigate,
  ...linkProps
}: WikiLinkProps) => {
  const context = useContext(TW5ReactContext);
  const stableOnClick = useCallback(
    makeLinkClickHandler(tiddler, context?.parentWidget, onNavigate),
    [tiddler, context, onNavigate]
  );
  if (context === null) {
    return errorMsg(
      "Cannot create WikiLink component without a TW5ReactContext"
    );
  }
  return (
    <a
      onClick={stableOnClick}
      {...{
        ...getWikiLinkProps(context, tiddler),
        ...linkProps,
      }}
    >
      {children ?? tiddler}
    </a>
  );
};
