// Overrides https://github.com/Jermolene/TiddlyWiki5/blob/master/core/modules/startup/story.js
import type { } from "@tiddlybase/tw5-types/src/index";

import {
  applyWikiViewState,
  copyURLToClipboard,
  createPermaURL,
  getStoryList,
  onNavigation,
  parseParentURL,
} from "./plugin-shared"
import { TIDDLYBASE_TITLE_PARENT_LOCATION, TW5_TITLE_DEFAULT_TIDDLERS, TW5_TITLE_HISTORY_LIST, TW5_TITLE_STORY_LIST } from "packages/shared/src/constants";
import { WikiViewState } from "packages/shared/src/wiki-view-state";

// Export name and synchronous status
export const name = 'story';
export const after = ['startup'];
export const synchronous = true;

// Links to help, if there is no param
const HELP_OPEN_EXTERNAL_WINDOW = "http://tiddlywiki.com/#WidgetMessage%3A%20tm-open-external-window";


export const startup = function () {
  // Open startup tiddlers
  if (!$tw.browser) {
    return;
  }
  const parsedParentURL = parseParentURL();
  openStartupTiddlers(
    parsedParentURL.pathVariables['tiddler'],
    parsedParentURL.pathVariables['filter']
  );
  // Listen for the tm-browser-refresh message
  $tw.rootWidget.addEventListener("tm-browser-refresh", () => {
    window.location.reload();
  });
  // Listen to updates to the parent iframe URL
  $tw.wiki.addEventListener('change', wikiChanges => {
    if (TIDDLYBASE_TITLE_PARENT_LOCATION in wikiChanges) {
      const wikiViewState = $tw.wiki.getTiddler(TIDDLYBASE_TITLE_PARENT_LOCATION)?.fields['wikiViewState'] as WikiViewState | undefined;
      if (wikiViewState) {
        console.log("popState", wikiViewState)
        applyWikiViewState(wikiViewState);
      }
    }
  })
  // Listen for tm-open-external-window message
  $tw.rootWidget.addEventListener("tm-open-external-window", (event: $tw.Widget.OpenExternalWindowEvent) => {
    var paramObject = event.paramObject || {},
      strUrl = event.param || HELP_OPEN_EXTERNAL_WINDOW,
      strWindowName = paramObject.windowName,
      strWindowFeatures = paramObject.windowFeatures;
    window.open(strUrl, strWindowName, strWindowFeatures);
  });
  // Listen for the tm-print message
  $tw.rootWidget.addEventListener("tm-print", event => {
    ((event.event as any)?.view || window).print();
  });
  // Listen for the tm-home message
  $tw.rootWidget.addEventListener("tm-home", () => {
    window.location.hash = "";
    var storyFilter = $tw.wiki.getTiddlerText(TW5_TITLE_DEFAULT_TIDDLERS),
      storyList = $tw.wiki.filterTiddlers(storyFilter!);
    //invoke any hooks that might change the default story list
    storyList = $tw.hooks.invokeHook("th-opening-default-tiddlers-list", storyList);
    $tw.wiki.addTiddler({
      title: TW5_TITLE_STORY_LIST,
      text: "",
      list: storyList,
      ...$tw.wiki.getModificationFields()
    });
    if (storyList[0]) {
      $tw.wiki.addToHistory(storyList[0]);
    }
  });
  // Listen for the tm-permalink message
  $tw.rootWidget.addEventListener("tm-permalink", event => {
    const tiddler = event.param || event.tiddlerTitle;
    copyURLToClipboard(createPermaURL({ tiddler, filter: '' }));
  });
  // Listen for the tm-permaview message
  $tw.rootWidget.addEventListener("tm-permaview", () => {
    const storyList = getStoryList()
    const filter = $tw.utils.stringifyList(storyList);
    copyURLToClipboard(createPermaURL({ filter, tiddler: '' }));
  });
  // Listen for navigate events and update addressbar accordingly
  $tw.hooks.addHook("th-navigating", event => {
    onNavigation(event.navigateTo);
    return event;
  });
  // TODO: listen to close tiddler events and update address bar

};


const openStartupTiddlers = (
  tiddler: string | undefined,
  filter: string | undefined,
) => {
  // Process the story filter to get the story list
  let storyList = filter ? $tw.wiki.filterTiddlers(filter) : getStoryList();
  // Invoke any hooks that want to change the default story list
  storyList = $tw.hooks.invokeHook("th-opening-default-tiddlers-list", storyList);
  // If the target tiddler isn't included then splice it in at the top
  if (tiddler && storyList.indexOf(tiddler) === -1) {
    storyList = [tiddler, ...storyList];
  }
  // Save the story list
  $tw.wiki.addTiddler({
    title: TW5_TITLE_STORY_LIST,
    text: "",
    list: storyList,
    ...$tw.wiki.getModificationFields()
  });
  // Update history
  var story = new $tw.Story({
    wiki: $tw.wiki,
    storyTitle: TW5_TITLE_STORY_LIST,
    historyTitle: TW5_TITLE_HISTORY_LIST
  });

  // If a target tiddler was specified add it to the history stack
  if (tiddler && tiddler !== "") {
    // The target tiddler doesn't need double square brackets, but we'll silently remove them if they're present
    let target = tiddler;
    if (tiddler.indexOf("[[") === 0 && tiddler.substr(-2) === "]]") {
      target = tiddler.substr(2, tiddler.length - 4);
    }
    story.addToHistory(target);
  } else if (storyList.length > 0) {
    story.addToHistory(storyList[0]);
  }
}
