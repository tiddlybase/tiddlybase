import {
  TW5ReactContext,
} from "@tiddlybase/plugin-react/src/components/TW5ReactContext";
import { useContext } from "react";
import { errorMsg } from "@tiddlybase/plugin-react/src/components/JSError";
import { makeWikiLink } from "./tw5-utils";

const DEFAULT_EXTERNAL_LINK_PROPS = {
  // TiddlyWiki 5.2.7 includes https://github.com/Jermolene/TiddlyWiki5/pull/6528
  // which adds the "_codified_" class to links.",
  className: "tc-tiddlylink-external _codified_",
  rel: "noopener noreferrer",
  target: "_blank",
};

export const a = (props: React.AnchorHTMLAttributes<HTMLAnchorElement>): React.ReactElement => {
  const context = useContext(TW5ReactContext);
  if (context === null) {
    return errorMsg('Cannot create a element without a TW5ReactContext');
  }
  if (
    props.className === "internal new" &&
    typeof props.children === "string" &&
    !!props.href
  ) {
    /*  Internal wiki link case with double-bracket syntax, eg:
      [[Start|X]] -> {
        children: "X"
        className: "internal new"
        href: "Start"
      }
      // note this is opposite of the TW5 convention, [[Displayed Link Title|Tiddler Title]]
      // so we'll want to switch this. (See: https://tiddlywiki.com/static/Linking%2520in%2520WikiText.html )
  */
    return makeWikiLink(context, props.children, props.href);
  }
  if (props.href?.startsWith('#') && typeof props.children === 'string') {
    /*  Internal wiki link case with hash link href
    target tiddler: "foo bar"
    [Start](#foo%20bar) -> {
      children: "Start"
      href: "#foo%20bar"
    }
    */
    const targetTiddler = decodeURIComponent(props.href.substring(1))
    return makeWikiLink(context, targetTiddler, props.children);
  }
  // external link
  return (
    <a
      {...{
        ...DEFAULT_EXTERNAL_LINK_PROPS,
        ...props,
      }}
    >
      {props.children}
    </a>
  );
};
