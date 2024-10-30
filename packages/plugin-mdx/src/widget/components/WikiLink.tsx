import { useContext, useCallback, ReactNode } from "react";
import { TW5ReactContext } from "@tiddlybase/plugin-react/src/components/TW5ReactContext";
import { errorMsg } from "@tiddlybase/plugin-react/src/components/JSError";
import {
  NavigationEventHandler,
  getWikiLinkProps,
  makeLinkClickHandler,
  scrollToHeading
} from "./tw5-utils";
export {makeLinkClickHandler};

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

export const HeadingLink = ({tiddler, children, headingContent}:{tiddler?: string, children?: ReactNode, headingContent: string}) => {
  // currentTiddler isn't always the same tiddler as the one with the headings...
  const context = useContext(TW5ReactContext);
  const clickHandler = useCallback((event:React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    const effectiveTiddler = tiddler ? tiddler : context!.parentWidget?.getVariable("currentTiddler");
    scrollToHeading(effectiveTiddler, headingContent);
    event.stopPropagation();
    event.preventDefault();
    return false;
  }, [tiddler, headingContent]);
  return <a href="#" onClick={clickHandler}>{children ?? tiddler ?? headingContent}</a>
}
