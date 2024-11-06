import type {} from "@tiddlybase/tw5-types/src/index";

import {
  TW5ReactContextType,
} from "@tiddlybase/plugin-react/src/components/TW5ReactContext";
import {fragmentNameToURLHash} from "@tiddlybase/shared/src/fragment-utils"

export interface NavigationEvent {
  from?: string;
  to: string;
  fragment?: string;
  event: React.MouseEvent<HTMLAnchorElement, MouseEvent>;
};

export type NavigationEventHandler = (navigationEvent:NavigationEvent)=>void;

export const makeLinkClickHandler =
  (
    targetTiddler: string,
    fragment?: string,
    parentWidget?: $tw.Widget,
    navigationEventHandler?: NavigationEventHandler
  ): React.MouseEventHandler<HTMLAnchorElement> =>
  (event) => {
    // from tiddlywiki/core/modules/widgets/link.js:147
    const navigateEvent: $tw.Widget.NavigateEvent = {
      type: "tm-navigate",
      navigateTo: targetTiddler,
      navigateToFragment: fragment,
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
    if (navigationEventHandler) {
      navigationEventHandler({
        from: parentWidget?.getVariable("storyTiddler"),
        to: targetTiddler,
        event: event,
        fragment: fragment
      })
    }
    parentWidget?.dispatchEvent(navigateEvent);
    event.preventDefault();
    event.stopPropagation();
    return false;
  };

export const getWikiLinkProps = (
  context: TW5ReactContextType,
  targetTiddler: string,
  fragment?: string
):React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> => {
  const tiddlerExists =  context.parentWidget.wiki.tiddlerExists(targetTiddler);
  const isShadowTiddler =  context.parentWidget.wiki.isShadowTiddler(targetTiddler);
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
  return {
    className: classes.join(" "),
    href: fragmentNameToURLHash(fragment ?? ''),
  };
};
