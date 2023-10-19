import type { } from "@tiddlybase/tw5-types/src/index";
export const name = "prepare-react-dev-tools";
export const platforms = ["browser"];
export const after = ["startup"];
export const before = ["render"];
export const synchronous = true;

// NOTE: I wasn't able to get react dev tools to walk the component tree,
// not sure why. The websocket connection between the standalone react-devtools
// process and the tiddlybase sandboxed iframe was established.

const REACT_DEV_TOOLS_URL_TIDDLER_TITLE = "$:/plugins/tiddlybase/react/config/react-devtools-script-url"

export const loadScript = (
  url: string,
  attr?: { [key: string]: string },
  doc = globalThis.document
): Promise<Event> => {
  const elem = document.createElement("script");
  const elemAttr = attr || {};
  elemAttr.src = url;
  Object.entries(elemAttr).forEach(([key, value]) =>
    elem.setAttribute(key, value)
  );
  const firstScript = document.getElementsByTagName("script")[0];
  const parent =
    firstScript && firstScript.parentNode ? firstScript.parentNode : doc.body;
  parent.insertBefore(elem, firstScript);

  return new Promise((resolve) => {
    elem.onload = (ev) => resolve(ev);
  });
};

export const startup = () => {
  const url = $tw.wiki.getTiddler(REACT_DEV_TOOLS_URL_TIDDLER_TITLE)?.fields?.text;
  if (url) {
    console.log("injecting react dev tools script", url);
    loadScript(url);
  }
}
