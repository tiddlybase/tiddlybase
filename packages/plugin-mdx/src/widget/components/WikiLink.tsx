import { useContext, useCallback } from "react";
import { TW5ReactContext } from "@tiddlybase/plugin-react/src/components/TW5ReactContext";
import { errorMsg } from "@tiddlybase/plugin-react/src/components/JSError";
import {
  NavigationEventHandler,
  getWikiLinkProps,
  makeLinkClickHandler,
} from "./tw5-utils";
export {makeLinkClickHandler};

export interface WikiLinkProps
  extends React.DetailedHTMLProps<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    HTMLAnchorElement
  > {
  tiddler?: string;
  onNavigate?: NavigationEventHandler;
  fragment?: string;
}

export const WikiLink = ({
  tiddler,
  fragment,
  children,
  onNavigate,
  ...linkProps
}: WikiLinkProps) => {
  const context = useContext(TW5ReactContext);
  if (context === null) {
    return errorMsg(
      "Cannot create WikiLink component without a TW5ReactContext"
    );
  }
  const effectiveTiddler = tiddler ?? context!.parentWidget?.getVariable("currentTiddler");
  const stableOnClick = useCallback(
    makeLinkClickHandler(effectiveTiddler, fragment, context?.parentWidget, onNavigate),
    [effectiveTiddler, fragment, context, onNavigate]
  );

  return (
    <a
      onClick={stableOnClick}
      {...{
        ...getWikiLinkProps(context, effectiveTiddler, fragment),
        ...linkProps,
      }}
    >
      {children ?? effectiveTiddler}
    </a>
  );
};
