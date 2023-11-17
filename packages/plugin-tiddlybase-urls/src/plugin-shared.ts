import {
  PathVariables,
  createURL,
  parseURL
} from "@tiddlybase/shared/src/path-template-utils"
import {
  WikiViewState,
  TiddlerViewState,
  TIDDLER_ARGUMENTS_FIELDNAME,
  getTiddlerArgumentsTitle,
  TiddlerArguments
} from "@tiddlybase/shared/src/wiki-view-state"

import { PathTemplate } from "@tiddlybase/shared/src/path-template";
import {
  TIDDLYBASE_TITLE_PARENT_LOCATION,
  TIDDLYBASE_TITLE_PATH_TEMPLATE,
  TIDDLYBASE_LOCAL_STATE_PREFIX,
  TW5_TITLE_STORY_LIST,
  TW5_TITLE_HISTORY_LIST,
  TW5_TITLE_SIDEBAR,
  TW5_TITLE_PREFIX_FOLDED
} from "@tiddlybase/shared/src/constants";
import { SearchVariables } from "@tiddlybase/shared/src/tiddlybase-config-schema";

const SCROLL_DELAY_SAFETY_BUFFER = 10;

const getFoldStateTitle = (title: string) => `${TW5_TITLE_PREFIX_FOLDED}${title}`;

export const getTiddlerArguments = (title: string): SearchVariables | undefined => {
  return $tw.wiki.getTiddler(getTiddlerArgumentsTitle(title))?.fields?.[TIDDLER_ARGUMENTS_FIELDNAME];
}

const waitForAnimation = <R>(action: () => R): Promise<R> => new Promise((resolve) => {
  const scrollDelay = parseInt(
    $tw.wiki.getTiddler('$:/config/AnimationDuration')?.fields?.['text'] ?? "0",
    10) + SCROLL_DELAY_SAFETY_BUFFER;
  setTimeout(() => resolve(action()), scrollDelay);
});

export const onNavigation = (tiddler: string, hash?: string) => {
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
    updateAddressBar(
      { tiddler },
      // empty object passed so search params are cleared
      // of no tiddler arguments exist for target tiddler
      getTiddlerArguments(tiddler) ?? {},
      hash
    );
  });
};

type HistoryListItem = { title: string }

const getHistoryListTiddlers = () => JSON.parse(
    $tw.wiki.getTiddlerText(TW5_TITLE_HISTORY_LIST) ?? "null") as null | HistoryListItem[];

export const getActiveTiddler = (): string | undefined => {
  const storyList = getStoryList();
  // There may be no active tiddler if no tiddlers are currently open
  if (storyList.length === 0) {
    return undefined;
  }
  const storyListSet = new Set(storyList);
  // If the tiddler title in the navigateTo tiddler is in the storyList,
  // consider it the active tiddler
  const navigateTo = $tw.wiki.getTiddlerText(TIDDLYBASE_TITLE_LAST_NAVIGATE_TO);
  if (navigateTo && storyListSet.has(navigateTo)) {
    return navigateTo;
  }

  // At this point, storyList is not empty, but does not contain navigateTo
  // (probably because that tiddler was closed). The active tiddler is the
  // last tiddler in the history list which is still in storylist.
  const historyList = getHistoryListTiddlers();
  if (historyList) {
    for (let { title } of historyList.reverse()) {
      if (storyListSet.has(title)) {
        return title;
      }
    }
  }

  // If there was no historyList or no tiddler in the historylist is still in the storylist
  // but the storyList is not empty, return the first tiddler in the storylist
  return storyList[0];
}

export const getWikiViewState = (): WikiViewState => ({
  activeTiddler: getActiveTiddler(),
  scrollPosition: $tw.utils.getScrollPosition(),
  sidebar: $tw.wiki.getTiddler(TW5_TITLE_SIDEBAR)?.fields?.text !== "no",
  openTiddlers: ($tw.wiki.getTiddler(TW5_TITLE_STORY_LIST)?.fields.list ?? []).map((title: string) => {
    const tiddlerViewState: TiddlerViewState = { title };
    if ($tw.wiki.getTiddler(getFoldStateTitle(title))?.fields?.text === "hide") {
      tiddlerViewState.folded = true;
    }
    const tiddlerArguments = getTiddlerArguments(title);
    if (tiddlerArguments) {
      tiddlerViewState.tiddlerArguments = tiddlerArguments;
    }
    return tiddlerViewState;
  })
});

export const setTiddlerArguments = (tiddler: string, tiddlerArguments: TiddlerArguments) => {
  $tw.wiki.addTiddler({
    title: getTiddlerArgumentsTitle(tiddler),
    [TIDDLER_ARGUMENTS_FIELDNAME]: tiddlerArguments
  });
}

export const applyWikiViewState = (wikiViewState: WikiViewState): Promise<boolean> => {
  const tiddlersToSet = [{
    title: TW5_TITLE_SIDEBAR,
    text: wikiViewState.sidebar ? "yes" : "no"
  }] as $tw.TiddlerFields[];
  const storyList: string[] = []
  for (let tiddlerViewState of wikiViewState.openTiddlers) {
    storyList.push(tiddlerViewState.title);
    if (tiddlerViewState.folded) {
      tiddlersToSet.push({
        title: getFoldStateTitle(tiddlerViewState.title),
        text: "hide"
      })
    }
    if (tiddlerViewState.tiddlerArguments) {
      tiddlersToSet.push({
        [TIDDLER_ARGUMENTS_FIELDNAME]: tiddlerViewState.tiddlerArguments,
        // prevent arbitrary code execution by setting tiddler args and then
        // open the tiddler arguments tiddler as eg. mdx
        type: "text/plain",
        text: "",
        title: getTiddlerArgumentsTitle(tiddlerViewState.title)
      });
    }
  }
  tiddlersToSet.push({
    title: TW5_TITLE_STORY_LIST,
    list: wikiViewState.openTiddlers.map(t => t.title),
    setFromWikiViewState: ($tw.wiki.changeCount[TW5_TITLE_STORY_LIST] ?? 0) + 1
  })
  if (wikiViewState.activeTiddler) {
    tiddlersToSet.push({
      title: TIDDLYBASE_TITLE_LAST_NAVIGATE_TO,
      text: wikiViewState.activeTiddler
    })
  }
  $tw.wiki.addTiddlers(tiddlersToSet);
  // TODO: do we need to save / manually update historylist?
  return wikiViewState?.scrollPosition !== undefined ?
    waitForAnimation(() => {
      window.scrollTo({
        left: wikiViewState.scrollPosition!.x,
        top: wikiViewState.scrollPosition!.y
      });
      return true;
    }) : Promise.resolve(true); // if there's no scrolling, we can resolve the resulting promise immediately
}

const setTiddlerText = (title: string, text: string) => {
  $tw.wiki.addTiddler({
    title,
    text,
    ...$tw.wiki.getModificationFields()
  })
};

export const TIDDLYBASE_TITLE_LAST_NAVIGATE_TO = `${TIDDLYBASE_LOCAL_STATE_PREFIX}/last-navigated-to`;

export const getStoryList = () => $tw.wiki.getTiddler(TW5_TITLE_STORY_LIST)?.fields.list as string[] ?? [];

export const getParentURL = () => $tw.wiki.getTiddlerText(TIDDLYBASE_TITLE_PARENT_LOCATION)!;

export const getPathTemplate = () => $tw.wiki.getTiddler(TIDDLYBASE_TITLE_PATH_TEMPLATE)?.fields.pathTemplate as PathTemplate

export const parseParentURL = () => parseURL(getPathTemplate(), getParentURL());

export const createPermaURL = (
  pathVariables: PathVariables,
  searchVariables?: SearchVariables,
  hash?: string
): string => createURL(
  getPathTemplate(),
  getParentURL(),
  pathVariables,
  searchVariables,
  hash);


export const copyURLToClipboard = (url: string) => $tw.utils.copyToClipboard(url);

export const updateAddressBar = async (
  pathVariables: PathVariables,
  searchVariables?: SearchVariables,
  hash?: string) => {
    const wikiViewState = getWikiViewState();
    const newURL = await $tw.tiddlybase?.topLevelClient!(
      'changeURL',
      [wikiViewState, pathVariables, searchVariables, hash]);
    // update parent url tiddler
    $tw.wiki.addTiddler({
      title: TIDDLYBASE_TITLE_PARENT_LOCATION,
      text: newURL,
      wikiViewState,
      setFromWiki: true
    })
  }

export const saveNavigatingToTiddlerTitle = (tiddlerTitle: string) => {
  setTiddlerText(
    TIDDLYBASE_TITLE_LAST_NAVIGATE_TO,
    tiddlerTitle);
};
