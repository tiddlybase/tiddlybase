import { PathVariables, createURL, parseURL } from "@tiddlybase/shared/src/path-template-utils"
import { WikiViewState, TiddlerViewState, PERSISTED_STATE_FIELDNAME } from "@tiddlybase/shared/src/wiki-view-state"

import { PathTemplate } from "@tiddlybase/shared/src/path-template";
import { TIDDLYBASE_TITLE_PARENT_LOCATION, TIDDLYBASE_TITLE_PATH_TEMPLATE, TIDDLYBASE_LOCAL_STATE_PREFIX, TW5_TITLE_STORY_LIST, TW5_TITLE_HISTORY_LIST, TW5_TITLE_SIDEBAR, TW5_TITLE_PREFIX_FOLDED, TIDDLYBASE_TITLE_PREFIX_PERSISTED_STATE } from "@tiddlybase/shared/src/constants";

const SCROLL_DELAY_SAFETY_BUFFER = 10;

const getFoldStateTitle = (title: string) => `${TW5_TITLE_PREFIX_FOLDED}${title}`;

const getPersistateStateTitle = (title: string) => `${TIDDLYBASE_TITLE_PREFIX_PERSISTED_STATE}${title}`;

const waitForAnimation = (action: () => void): void => {
  const scrollDelay = parseInt(
    $tw.wiki.getTiddler('$:/config/AnimationDuration')?.fields?.['text'] ?? "0",
    10) + SCROLL_DELAY_SAFETY_BUFFER;
  setTimeout(action, scrollDelay);
}

export const onNavigation = (tiddler: string) => {
  /*
  The tm-navigating hook handler is called before the StoryList is updated.
  After the hook handler call, navigator calls story.addToStory synchronously.
  By adding a setTimeout callback here, it will execute once the StoryList
  has been updated with the current navigation.

  The AnimationDuration determins how long it takes to scroll to the tiddler
  to which we are navigating. Since the scroll position is only final afterwards,
  we should wait until the animation is over.
  */
  saveNavigatingToTiddlerTitle(tiddler);
  waitForAnimation(() => {
    updateAddressBar({ tiddler, filter: '' });
  });
};

export const getWikiViewState = (): WikiViewState => ({
  activeTiddler: getTiddlerText(TIDDLYBASE_TITLE_LAST_NAVIGATE_TO) ?? JSON.parse(getTiddlerText(TW5_TITLE_HISTORY_LIST) ?? "null")?.slice(-1)[0]?.title,
  scrollPosition: $tw.utils.getScrollPosition(),
  sidebar: $tw.wiki.getTiddler(TW5_TITLE_SIDEBAR)?.fields?.text !== "no",
  openTiddlers: ($tw.wiki.getTiddler(TW5_TITLE_STORY_LIST)?.fields.list ?? []).map((title: string) => {
    const tiddlerViewState: TiddlerViewState = { title };
    if ($tw.wiki.getTiddler(getFoldStateTitle(title))?.fields?.text === "hide") {
      tiddlerViewState.folded = true;
    }
    const persistedState = $tw.wiki.getTiddler(getPersistateStateTitle(title))?.fields?.[PERSISTED_STATE_FIELDNAME];
    if (persistedState) {
      tiddlerViewState.persistedState = persistedState;
    }
    return tiddlerViewState;
  })
});

export const applyWikiViewState = (wikiViewState: WikiViewState): void => {
  setTiddlerText(TW5_TITLE_SIDEBAR, wikiViewState.sidebar ? "yes" : "no");
  const storyList: string[] = []
  for (let tiddlerViewState of wikiViewState.openTiddlers) {
    storyList.push(tiddlerViewState.title);
    setTiddlerText(getFoldStateTitle(tiddlerViewState.title), tiddlerViewState.folded ? "hide" : "show");
    if (tiddlerViewState.persistedState) {
      $tw.wiki.addTiddler({
        title: getPersistateStateTitle(tiddlerViewState.title),
        [PERSISTED_STATE_FIELDNAME]: tiddlerViewState.persistedState
      });
    }
  }
  $tw.wiki.addTiddler({
    title: TW5_TITLE_STORY_LIST,
    list: wikiViewState.openTiddlers.map(t => t.title)
  })
  if (wikiViewState.activeTiddler) {
    saveNavigatingToTiddlerTitle(wikiViewState.activeTiddler);
  }
  // TODO: do we need to save / manually update historylist?
  waitForAnimation(() => window.scrollTo({
    left: wikiViewState.scrollPosition.x,
    top: wikiViewState.scrollPosition.y
  }));

}

const getTiddlerText = (title: string) => $tw.wiki.getTiddler(title)?.fields.text;

const setTiddlerText = (title: string, text: string) => {
  $tw.wiki.addTiddler({
    title,
    text,
    ...$tw.wiki.getModificationFields()
  })
};

export const TIDDLYBASE_TITLE_LAST_NAVIGATE_TO = `${TIDDLYBASE_LOCAL_STATE_PREFIX}/last-navigated-to`;

export const getStoryList = () => $tw.wiki.getTiddler(TW5_TITLE_STORY_LIST)?.fields.list as string[] ?? [];

export const getParentURL = () => getTiddlerText(TIDDLYBASE_TITLE_PARENT_LOCATION)!;

export const getPathTemplate = () => $tw.wiki.getTiddler(TIDDLYBASE_TITLE_PATH_TEMPLATE)?.fields.pathTemplate as PathTemplate

export const parseParentURL = () => parseURL(getPathTemplate(), getParentURL());

export const createPermaURL = (
  pathVariables: PathVariables
): string => createURL(getPathTemplate(), getParentURL(), pathVariables);


export const copyURLToClipboard = (url: string) => $tw.utils.copyToClipboard(url);

export const updateAddressBar = (
  pathVariables: Record<string, string>,
  searchVariables?: Record<string, string>,
  hash?: string) => $tw.tiddlybase?.topLevelClient!(
    'changeURL',
    [getWikiViewState(), pathVariables, searchVariables, hash]);

export const saveNavigatingToTiddlerTitle = (tiddlerTitle: string) => {
  setTiddlerText(
    TIDDLYBASE_TITLE_LAST_NAVIGATE_TO,
    tiddlerTitle);
};
