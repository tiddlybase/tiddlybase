import type {} from "@tiddlybase/tw5-types/src/index";

import { LogContext } from "./LogContext";
import { TranscludeTiddler } from "./TranscludeTiddler";
import {
  TW5ReactContext,
  TW5ReactContextType,
} from "@tiddlybase/plugin-react/src/components/TW5ReactContext";
import { useContext } from "react";

const DEFAULT_EXTERNAL_LINK_PROPS = {
  className: "tc-tiddlylink-external",
  rel: "noopener noreferrer",
  target: "_blank",
};

const makeLinkClickHandler =
  (
    targetTiddler: string,
    parentWidget?: $tw.Widget
  ): React.AnchorHTMLAttributes<HTMLAnchorElement>["onClick"] =>
  (event) => {
    // from tiddlywiki/core/modules/widgets/link.js:147
    const navigateEvent: $tw.Widget.NavigateEvent = {
      type: "tm-navigate",
      navigateTo: targetTiddler,
      navigateFromTitle: parentWidget?.getVariable("storyTiddler"),
      navigateFromNode: this,
      navigateSuppressNavigation:
        event.metaKey || event.ctrlKey || event.button === 1,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      event: event.nativeEvent,
    };
    if (event.target instanceof HTMLAnchorElement) {
      const bounds = event.target.getBoundingClientRect();
      Object.assign(navigateEvent, {
        navigateFromClientRect: {
          top: bounds.top,
          left: bounds.left,
          width: bounds.width,
          right: bounds.right,
          bottom: bounds.bottom,
          height: bounds.height,
        },
        navigateFromClientTop: bounds.top,
        navigateFromClientLeft: bounds.left,
        navigateFromClientWidth: bounds.width,
        navigateFromClientRight: bounds.right,
        navigateFromClientBottom: bounds.bottom,
        navigateFromClientHeight: bounds.height,
      });
    }
    parentWidget?.dispatchEvent(navigateEvent);
    event.preventDefault();
    event.stopPropagation();
    return false;
  };

export const makeWikiLink = (
  context: TW5ReactContextType | null,
  targetTiddler: string,
  label?: string
) => {
  const tiddlerExists =  context?.parentWidget.wiki.tiddlerExists(targetTiddler);
  const isShadowTiddler =  context?.parentWidget.wiki.isShadowTiddler(targetTiddler);

  const classes: string[] = [];
  // from tiddlywiki/core/modules/widgets/link.js:68
  classes.push("tc-tiddlylink");
  if (isShadowTiddler) {
    classes.push("tc-tiddlylink-shadow");
  }
  if (
    tiddlerExists &&
    isShadowTiddler
  ) {
    classes.push("tc-tiddlylink-missing");
  } else if (tiddlerExists) {
    classes.push("tc-tiddlylink-resolves");
  }
  return (
    <a
      className={classes.join(" ")}
      href={`#${encodeURIComponent(targetTiddler)}`}
      onClick={makeLinkClickHandler(
        targetTiddler,
        context?.parentWidget
      )}
    >
      {label ?? targetTiddler}
    </a>
  );
};

export const components = {
  LogContext,
  TranscludeTiddler,
  a(props: React.AnchorHTMLAttributes<HTMLAnchorElement>): React.ReactElement {
    const context = useContext(TW5ReactContext);
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
  },
};
