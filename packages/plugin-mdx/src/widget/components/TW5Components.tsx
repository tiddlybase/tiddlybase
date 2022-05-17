import type { Widget, Wiki } from "packages/tw5-types/src";
import { LogContext } from "./LogContext";
import { TranscludeTiddler } from "./TranscludeTiddler";

const DEFAULT_EXTERNAL_LINK_PROPS = {
  className: "tc-tiddlylink-external",
  rel: "noopener noreferrer",
  target: "_blank",
};

type InternalLink = {
  label: string;
  tiddlerTitle: string;
  tiddlerExists: boolean;
  isShadowTiddler: boolean;
};

const checkExistsAndShadow = (
  link: Omit<InternalLink, "tiddlerExists" | "isShadowTiddler">,
  wiki: Wiki
): InternalLink => ({
  ...link,
  tiddlerExists: wiki.tiddlerExists(link.tiddlerTitle),
  isShadowTiddler: wiki.isShadowTiddler(link.tiddlerTitle),
});

const getInternalLinkProps = (
  props: React.AnchorHTMLAttributes<HTMLAnchorElement>,
  parentWidget: Widget
): InternalLink | undefined => {
  if (
    props.className === "internal new" &&
    typeof props.children === "string" &&
    props.href
  ) {
    /* internal wiki link props
      // note this is opposite of the TW5 convention, [[Displayed Link Title|Tiddler Title]]
      // so we'll want to switch this. (See: https://tiddlywiki.com/static/Linking%2520in%2520WikiText.html )
      [[Start|X]] -> {
        children: "X"
        className: "internal new"
        href: "Start"
      }

      [[Start]] -> {
        children: "Start"
        className: "internal new"
        href: "Start"
      }
      */
    return checkExistsAndShadow(
      {
        label: props.href,
        tiddlerTitle: props.children,
      },
      parentWidget.wiki
    );
  }
  if (props.href?.startsWith("#") && typeof props.children === "string") {
    /*
      [X](#Start) -> {
        children: "X"
        href: "#Start"
      }
      */
    return checkExistsAndShadow(
      {
        label: props.children,
        tiddlerTitle: props.href.substring(1),
      },
      parentWidget.wiki
    );
  }
  // not internal link
  return undefined;
};

const makeLinkClickHandler =
  (
    targetTiddler: string,
    parentWidget: Widget
  ): React.AnchorHTMLAttributes<HTMLAnchorElement>["onClick"] =>
  (event) => {
    // from tiddlywiki/core/modules/widgets/link.js:147
    const attributes = {
      type: "tm-navigate",
      navigateTo: targetTiddler,
      navigateFromTitle: parentWidget.getVariable("storyTiddler"),
      navigateFromNode: this,
      navigateSuppressNavigation:
        event.metaKey || event.ctrlKey || event.button === 1,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      event: event,
    };
    if (event.target instanceof HTMLAnchorElement) {
      const bounds = event.target.getBoundingClientRect();
      Object.assign(attributes, {
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
    parentWidget.dispatchEvent(attributes);
    event.preventDefault();
    event.stopPropagation();
    return false;
  };

export const makeTW5Components = (parentWidget: Widget) => ({
  LogContext,
  TranscludeTiddler,
  a(props: React.AnchorHTMLAttributes<HTMLAnchorElement>): React.ReactElement {
    const internalLinkProps = getInternalLinkProps(props, parentWidget);
    console.log("internalLinkProps", internalLinkProps);
    if (internalLinkProps) {
      const classes: string[] = [];
      // from tiddlywiki/core/modules/widgets/link.js:68
      classes.push("tc-tiddlylink");
      if (internalLinkProps.isShadowTiddler) {
        classes.push("tc-tiddlylink-shadow");
      }
      if (
        !internalLinkProps.tiddlerExists &&
        !internalLinkProps.isShadowTiddler
      ) {
        classes.push("tc-tiddlylink-missing");
      } else if (internalLinkProps.tiddlerExists) {
        classes.push("tc-tiddlylink-resolves");
      }
      return (
        <a
          className={classes.join(" ")}
          href={`#${encodeURIComponent(internalLinkProps.tiddlerTitle)}`}
          onClick={makeLinkClickHandler(internalLinkProps.tiddlerTitle, parentWidget)}
        >
          {internalLinkProps.label}
        </a>
      );
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
});