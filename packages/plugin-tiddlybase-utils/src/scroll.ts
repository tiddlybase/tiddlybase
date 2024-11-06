import type {} from "@tiddlybase/tw5-types/src/index"

const flatten = (...results:(NodeList|Node[])[]):Node[] => {
  let flattened:Node[] = [];
  for (let r of results) {
    flattened = flattened.concat((r instanceof NodeList) ? [...r] : r);
  }
  return flattened;
}

export const scrollToFragment = (
  tiddler: string,
  fragment:string,
  rootWidget = $tw.rootWidget,
  doc = document
) => {
  // get div container for tiddler
  const container = doc.querySelector(`div[data-tiddler-title='${tiddler}']`);
  if (container !== null) {
    const candidates = flatten(
      // first, search for any element with the given id
      container.querySelectorAll(`[id='${fragment}']`),
      // then, any element with the data-tiddlybase-fragment attribute set
      container.querySelectorAll(`[data-tiddlybase-fragment='${fragment}']`),
      // then, search for anchor elements with the given name
      container.querySelectorAll(`a[name='${fragment}']`),
      // finally, any headers with text matching the provided fragment
      [...container.querySelectorAll("h1, h2:not(.tc-title), h3, h4, h5, h6")].filter(
        h => (h as HTMLHeadingElement).innerText === fragment)
    );
    if (candidates.length > 0) {
      rootWidget.dispatchEvent(
        {
          type: "tm-scroll",
          target: candidates[0] as Element,
          paramObject: {
            animationDuration: 0
          }
        }
      )
    }
  }
}
