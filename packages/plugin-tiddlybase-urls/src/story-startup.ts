import type { } from "@tiddlybase/tw5-types/src/index";

import {
  TIDDLYBASE_TITLE_PARENT_LOCATION,
  TW5_TITLE_GETTING_STARTED,
  TW5_TITLE_DEFAULT_TIDDLERS,
  TW5_TITLE_HISTORY_LIST,
  TW5_TITLE_STORY_LIST,
  TW5_TITLE_ANIMATION_DURATION,
  TIDDLYBASE_LOCAL_STATE_PREFIX,
  TW5_TITLE_SIDEBAR,
  TW5_TITLE_PREFIX_FOLDED,
  TIDDLYBASE_TITLE_PATH_TEMPLATE
} from "@tiddlybase/shared/src/constants";
import { TIDDLER_ARGUMENTS_FIELDNAME, TiddlerArguments, TiddlerViewState, WikiViewState, getTiddlerArgumentsTitle } from "@tiddlybase/shared/src/wiki-view-state";
import { PathTemplate } from "@tiddlybase/shared/src/path-template";
import { PathVariables, createURL, parseURL } from "@tiddlybase/shared/src/path-template-utils";
import { SearchVariables } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { APIClient } from "@tiddlybase/rpc/src/types";
import { TopLevelAPIForSandboxedWiki } from "@tiddlybase/rpc/src/top-level-api";
import { scrollToFragment } from "@tiddlybase/plugin-tiddlybase-utils/src/scroll";

type HistoryListItem = { title: string }

const TIDDLYBASE_TITLE_ACTIVE_TIDDLER = `${TIDDLYBASE_LOCAL_STATE_PREFIX}/active-tiddler`;
const HELP_OPEN_EXTERNAL_WINDOW = "http://tiddlywiki.com/#WidgetMessage%3A%20tm-open-external-window";
const DATA_TIDDLER_TITLE = 'data-tiddler-title'

const getFoldStateTitle = (title: string) => `${TW5_TITLE_PREFIX_FOLDED}${title}`;


export const findTiddlerDOMParent = (elem?: HTMLElement) => {
  for (
    let currentElement = elem;
    !!currentElement;
    currentElement = currentElement.parentElement ?? undefined) {
    if (currentElement.getAttribute(DATA_TIDDLER_TITLE)) {
      return currentElement;
    }
  }
  return undefined;
}

export const getClickedTiddlerTitle = (elem?: HTMLElement) => findTiddlerDOMParent(elem)?.getAttribute(DATA_TIDDLER_TITLE) ?? undefined;


export class StoryStartup {

  SCROLL_DELAY_SAFETY_BUFFER = 10;


  wiki: $tw.Wiki;
  hooks: typeof $tw.hooks;
  utils: typeof $tw.utils;
  rootWidget: $tw.Widget;
  Story: typeof $tw.Story;
  topLevelClient?: APIClient<TopLevelAPIForSandboxedWiki>

  constructor({
    wiki = globalThis.$tw.wiki,
    hooks = globalThis.$tw.hooks,
    utils = globalThis.$tw.utils,
    rootWidget = globalThis.$tw.rootWidget,
    Story = globalThis.$tw.Story,
    topLevelClient = globalThis.$tw.tiddlybase?.topLevelClient
  }: {
    wiki?: $tw.Wiki,
    hooks?: typeof $tw.hooks,
    utils?: typeof $tw.utils,
    rootWidget?: $tw.Widget,
    Story?: typeof $tw.Story,
    topLevelClient?: APIClient<TopLevelAPIForSandboxedWiki>
  } = {}) {
    this.wiki = wiki;
    this.hooks = hooks;
    this.utils = utils;
    this.rootWidget = rootWidget;
    this.Story = Story;
    this.topLevelClient = topLevelClient
  }


  handleCopyPermalink(event: $tw.Widget.PermalinkEvent & $tw.WidgetDOMEventField) {
    const tiddler = event.param || event.tiddlerTitle;
    this.utils.copyToClipboard(
      this.createPermaURL(
        {
          tiddler,
          // clear viewState if it was set
          viewState: ''
        },
        this.getTiddlerArguments(tiddler),
      ));
  }

  handleCopyPermaview() {
    this.utils.copyToClipboard(
      this.createPermaURL({
        viewState: JSON.stringify(this.serializeWikiViewState()),
        // clear tiddler path template if it was set
        tiddler: ''
      }));
  }

  handleWikiChange(wikiChange: $tw.WikiChange) {
    /**
     * handleWikiChange() handles all changes which are communicated via tiddler
     * updates. Note that it is possible to get into an infinite loop of updates
     * if handleWikiChange() triggers an address bar update by calling the top-
     * level iframe, which will in turn update the TIDDLYBASE_TITLE_PARENT_LOCATION
     * tiddler.
     *
     * To avoid such loops, handleWikiChange detects if tiddlers were set from
     * within the wiki and performs no action in such cases.
     */
    // TIDDLYBASE_TITLE_PARENT_LOCATION is updated by the parent iframe when
    // The user clicks the browser's Back/Forward buttons.
    if (TIDDLYBASE_TITLE_PARENT_LOCATION in wikiChange) {
      // If current parent location was set from within the wiki, do not update
      // the view state.
      if (this.wiki.getTiddler(TIDDLYBASE_TITLE_PARENT_LOCATION)?.fields?.['setFromWiki'] !== true) {
        const wikiViewState = this.getWikiViewState()
        // If a wikiViewState was popped of the History API stack, apply it.
        if (wikiViewState) {
          this.applyWikiViewState(wikiViewState);
          return
        }
      }
    }
    let updateAddressBarRequired = false;
    // the address bar should be updated if the StoryList changed, unless it was
    // changed by us).
    if (TW5_TITLE_STORY_LIST in wikiChange) {
      // Don't update the URL in the address bar if the change to StoryList was
      // cased by by applyWikiViewState(), since that causes an infinite loop.
      if (this.wiki.getTiddler(TW5_TITLE_STORY_LIST)?.fields?.setFromWikiViewState === this.wiki.changeCount[TW5_TITLE_STORY_LIST]) {
        return;
      }
      updateAddressBarRequired = true
    }
    // Update the address bar URL if the currently active tiddler's TiddlerArguments
    // changed.
    const activeTiddler = this.getActiveTiddler();
    if (!updateAddressBarRequired && activeTiddler) {
      const argumentsTiddler = getTiddlerArgumentsTitle(activeTiddler)
      if (argumentsTiddler in wikiChange) {
        updateAddressBarRequired = true
      }
    }
    if (updateAddressBarRequired) {
      console.log("address bar update triggered by wiki change", activeTiddler, wikiChange);
      if (activeTiddler) {
        this.setActiveTiddlerTitle(activeTiddler);
      }
      this.updateAddressBar(
        { tiddler: activeTiddler ?? '' },
        activeTiddler ? this.getTiddlerArguments(activeTiddler) : undefined
      );
    }
  }

  getTiddlerArguments(title: string): SearchVariables | undefined {
    return this.wiki.getTiddler(getTiddlerArgumentsTitle(title))?.fields?.[TIDDLER_ARGUMENTS_FIELDNAME];
  }

  waitForAnimation<R>(action: () => R): Promise<R> {
    return new Promise((resolve) => {
      const scrollDelay = parseInt(
        this.wiki.getTiddler(TW5_TITLE_ANIMATION_DURATION)?.fields?.['text'] ?? "0",
        10) + this.SCROLL_DELAY_SAFETY_BUFFER;
      setTimeout(() => resolve(action()), scrollDelay);
    })
  };

  onNavigation(event:$tw.Widget.NavigateEvent) {
    const tiddler = event.navigateTo;
    const fragment = event.navigateToFragment;
    // navigateSuppressNavigation must be set to avoid jumping to the top of the
    // tiddler when a fragment is set upon initial load. This caused by the
    // the "th-page-refreshed" event being invoked due to update of
    // $:/HistoryList
    // see https://github.com/TiddlyWiki/TiddlyWiki5/blob/0160a4f3d34e0549f3a0591986dc8e8e01c854a7/core/modules/startup/render.js#L69
    event.navigateSuppressNavigation = this.getActiveTiddler() === tiddler;
    // The AnimationDuration determins how long it takes to scroll to the tiddler
    // to which we are navigating. Since the scroll position is only final afterwards,
    // we should wait until the animation is over.
    this.waitForAnimation(() => {
      // NOTE: Nothing actually async happens in this function.
      // The reason it must be a promise is that TiddlyWiki handles the
      // 'tm-navigate' event synchronously, so the new tiddler is rendered
      // immediately *after* this function returns. However, if there was a
      // fragment provided, the browser must scroll to it when the DOM element
      // of the newly opened tiddler is already available. By creating a
      // promise, we can schedule the code below to run at the next tick.
      if (this.getActiveTiddler() !== tiddler) {
        this.setActiveTiddlerTitle(tiddler);
      }
      // once the tiddler is ready, we must update the address bar
      this.updateAddressBar(
        { tiddler },
        // empty object passed so search params are cleared
        // if no tiddler arguments exist for target tiddler
        this.getTiddlerArguments(tiddler) ?? {},
        fragment
      );
      // If a fragment was provided, scroll to the fragment if
      // provided, otherwise top of active tiddler
      scrollToFragment(tiddler, fragment);
    });
    return event;
  };

  getHistoryListTiddlers(): HistoryListItem[] | null {
    return JSON.parse(this.wiki.getTiddlerText(TW5_TITLE_HISTORY_LIST) ?? "null") as null | HistoryListItem[];
  }

  getActiveTiddler(): string | undefined {
    const storyList = this.getStoryList();
    // There may be no active tiddler if no tiddlers are currently open
    if (storyList.length === 0) {
      return undefined;
    }
    const storyListSet = new Set(storyList);
    // If the tiddler title in the navigateTo tiddler is in the storyList,
    // consider it the active tiddler
    const activeTiddler = this.wiki.getTiddlerText(TIDDLYBASE_TITLE_ACTIVE_TIDDLER);
    if (activeTiddler && storyListSet.has(activeTiddler)) {
      return activeTiddler;
    }

    // StoryList is not empty, but does not contain activeTiddler,
    // probably because that tiddler was closed. The new active tiddler is the
    // last tiddler in the history list which is still in storylist.
    const historyList = this.getHistoryListTiddlers();
    if (historyList) {
      for (let { title } of historyList.reverse()) {
        if (storyListSet.has(title)) {
          return title;
        }
      }
    }

    // If there was no historyList or no tiddler in the historylist is still in
    // the storylist but the storyList is not empty, return the first tiddler
    // in the storylist
    return storyList[0];
  }

  serializeWikiViewState(fragment?: string): WikiViewState {
    return {
      fragment,
      activeTiddler: this.getActiveTiddler(),
      sidebar: this.wiki.getTiddler(TW5_TITLE_SIDEBAR)?.fields?.text !== "no",
      openTiddlers: this.getStoryList().map((title: string) => {
        const tiddlerViewState: TiddlerViewState = { title };
        if (this.wiki.getTiddler(getFoldStateTitle(title))?.fields?.text === "hide") {
          tiddlerViewState.folded = true;
        }
        const tiddlerArguments = this.getTiddlerArguments(title);
        if (tiddlerArguments) {
          tiddlerViewState.tiddlerArguments = tiddlerArguments;
        }
        return tiddlerViewState;
      })
    }
  }

  setTiddlerArguments(tiddler: string, tiddlerArguments: TiddlerArguments) {
    this.wiki.addTiddler({
      title: getTiddlerArgumentsTitle(tiddler),
      [TIDDLER_ARGUMENTS_FIELDNAME]: tiddlerArguments
    });
  }

  async applyWikiViewState(wikiViewState: WikiViewState): Promise<boolean> {
    /**
     * Applies a given wikiViewState to the current wiki.
     */
    // Set sidebar state
    const tiddlersToSet:$tw.TiddlerFields[] = [];
    if (typeof(wikiViewState.sidebar) === 'boolean') {
      tiddlersToSet.push({
        title: TW5_TITLE_SIDEBAR,
        text: wikiViewState.sidebar ? "yes" : "no"
      })
    }
    const storyList: string[] = []
    for (let tiddlerViewState of wikiViewState.openTiddlers) {
      // Add each open tiddler to the story river
      storyList.push(tiddlerViewState.title);
      if (tiddlerViewState.folded) {
        tiddlersToSet.push({
          title: getFoldStateTitle(tiddlerViewState.title),
          text: "hide"
        })
      }
      // Set tiddler arguments for each tiddler (if supplied)
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
    // Set $:/StoryList
    tiddlersToSet.push({
      title: TW5_TITLE_STORY_LIST,
      list: wikiViewState.openTiddlers.map(t => t.title),
      setFromWikiViewState: (this.wiki.changeCount[TW5_TITLE_STORY_LIST] ?? 0) + 1
    })
    // Set active tiddler
    if (wikiViewState.activeTiddler) {
      tiddlersToSet.push({
        title: TIDDLYBASE_TITLE_ACTIVE_TIDDLER,
        text: wikiViewState.activeTiddler
      })
    }
    // Apply all wiki changes
    this.wiki.addTiddlers(tiddlersToSet);
    await this.scrollToFragment(wikiViewState)
    return true;
  }

  async scrollToFragment(wikiViewState: WikiViewState) {
    if (!!wikiViewState.activeTiddler) {
      await this.waitForAnimation(() => {
        scrollToFragment(wikiViewState.activeTiddler!, wikiViewState.fragment);
      })
    }
  }

  getStoryList() {
    const storyList = this.wiki.getTiddler(TW5_TITLE_STORY_LIST)?.fields.list as string[] ?? [];
    return this.hooks.invokeHook("th-opening-default-tiddlers-list", storyList);
  }

  getParentURL() {
    return this.wiki.getTiddlerText(TIDDLYBASE_TITLE_PARENT_LOCATION)!;
  }

  getPathTemplate() {
    return this.wiki.getTiddler(TIDDLYBASE_TITLE_PATH_TEMPLATE)?.fields.pathTemplate as PathTemplate
  }

  getDefaultTiddlers() {
    const filter = this.wiki.getTiddler(TW5_TITLE_DEFAULT_TIDDLERS)?.fields?.text;
    if (filter) {
      return this.wiki.filterTiddlers(filter);
    }
    return [];
  }

  createPermaURL(
    pathVariables: PathVariables,
    searchVariables?: SearchVariables,
    hash?: string
  ): string {
    return createURL(
      this.getPathTemplate(),
      this.getParentURL(),
      pathVariables,
      searchVariables,
      hash);
  }

  async updateAddressBar(
    pathVariables: PathVariables,
    searchVariables?: SearchVariables,
    fragment?: string) {
    const wikiViewState = this.serializeWikiViewState(fragment);
    const newURL = await this.topLevelClient!(
      'changeURL',
      [wikiViewState, pathVariables, searchVariables ?? {}, fragment]);
    // update parent url tiddler
    this.wiki.addTiddler({
      title: TIDDLYBASE_TITLE_PARENT_LOCATION,
      text: newURL,
      wikiViewState,
      setFromWiki: true
    })
  }

  setActiveTiddlerTitle(tiddlerTitle: string) {
    this.wiki.addTiddler({
      title: TIDDLYBASE_TITLE_ACTIVE_TIDDLER,
      text: tiddlerTitle,
      ...this.wiki.getModificationFields()
    })
  };

  registerHandlers() {
    // Listen for the tm-browser-refresh message
    this.rootWidget.addEventListener("tm-browser-refresh", () => {
      window.location.reload();
    });

    // Listen to updates to the parent iframe URL
    this.wiki.addEventListener('change', this.handleWikiChange.bind(this));

    // Listen for navigate events and update addressbar accordingly
    this.hooks.addHook("th-navigating", this.onNavigation.bind(this));

    // listen for any clicks in case it originates from a tiddler element
    document.addEventListener('click', e => {
      this.handleClickEvent(e);
    }, true);

    // Listen for tm-open-external-window message
    this.rootWidget.addEventListener("tm-open-external-window", (event: $tw.Widget.OpenExternalWindowEvent) => {
      var paramObject = event.paramObject || {},
        strUrl = event.param || HELP_OPEN_EXTERNAL_WINDOW,
        strWindowName = paramObject.windowName,
        strWindowFeatures = paramObject.windowFeatures;
      window.open(strUrl, strWindowName, strWindowFeatures);
    });
    // Listen for the tm-print message
    this.rootWidget.addEventListener("tm-print", event => {
      ((event.event as any)?.view || window).print();
    });
    // Listen for the tm-home message
    this.rootWidget.addEventListener("tm-home", () => {
      var storyFilter = this.wiki.getTiddlerText(TW5_TITLE_DEFAULT_TIDDLERS),
        storyList = this.wiki.filterTiddlers(storyFilter!);
      //invoke any hooks that might change the default story list
      storyList = this.hooks.invokeHook("th-opening-default-tiddlers-list", storyList);
      this.wiki.addTiddler({
        title: TW5_TITLE_STORY_LIST,
        text: "",
        list: storyList,
        ...this.wiki.getModificationFields()
      });
      if (storyList[0]) {
        this.wiki.addToHistory(storyList[0]);
      }
    });
    // Listen for the tm-permalink message
    this.rootWidget.addEventListener("tm-permalink", event => {
      this.handleCopyPermalink(event)
    });
    // Listen for the tm-permaview message
    this.rootWidget.addEventListener("tm-permaview", () => {
      this.handleCopyPermaview()
    });
  }

  handleClickEvent(e: MouseEvent) {
    if (e.target instanceof HTMLElement) {
      const clickedTiddlerTitle = getClickedTiddlerTitle(e.target);
      if (clickedTiddlerTitle && (this.getActiveTiddler() !== clickedTiddlerTitle)) {
        this.setActiveTiddlerTitle(clickedTiddlerTitle);
        this.updateAddressBar(
          { tiddler: clickedTiddlerTitle },
          this.getTiddlerArguments(clickedTiddlerTitle)
        );
      }
    }
  }

  private getViewStateFromOpenTiddlers(tiddlerList: string[], activeTiddler?: string, searchVariables?: SearchVariables, fragment?: string): WikiViewState {
    const tiddlers = [...tiddlerList];
    let activeTiddlerIndex = 0;
    if (activeTiddler) {
      activeTiddlerIndex = tiddlers.indexOf(activeTiddler);
      if (activeTiddlerIndex < 0) {
        tiddlers.unshift(activeTiddler);
        activeTiddlerIndex = 0;
      }
    }
    const openTiddlers: TiddlerViewState[] = tiddlers.map(title => ({ title }))
    if (searchVariables) {
      // set search variables as tiddlerArguments for active tiddler
      openTiddlers[activeTiddlerIndex].tiddlerArguments = searchVariables;
    }
    return {
      openTiddlers,
      activeTiddler: activeTiddler ?? tiddlers[0],
      fragment
    }
  }

  createWikiViewFromParentURL(pathTemplate: PathTemplate, url: string): WikiViewState {
    /**
    WikiView creation rules:

    Case 1. If URL contains an encoded WikiViewState, ignore everything else and return it.

    Case 2. If the URL contains a tiddler title then return a WikiViewState with
        that tiddler marked as active. This tiddler should be present in the openTiddlers
        array along with any tiddlers present in $:/StoryList.

    Case 3. If the URL does not contain a tiddler title, then return a WikiViewState
        with openTiddlers containing the contents of $:/StoryList or -if no
        $:/StoryList exists- the contents of $:/DefaultTiddlers. If the latter is
        also missing, then simply display the GettingStarted tiddler.
     */
    const parsed = parseURL(pathTemplate, url)
    // Case 1: If URL contains an encoded WikiViewState, ignore everything else and return it.
    if (parsed.pathVariables.viewState) {
      return JSON.parse(parsed.pathVariables.viewState)
    }
    // Case 2: Applicable if the URL contains an active tiddler title.
    if (parsed.pathVariables.tiddler) {
      return this.getViewStateFromOpenTiddlers(
        this.getStoryList(),
        parsed.pathVariables.tiddler,
        parsed.searchVariables,
        parsed.fragment);
    }
    // Case 3: No WikiViewState or active tiddler encoded in URL, use wiki contents
    //         to determine which tiddler(s) to display.
    for (let tiddlerSource of [
      () => this.getStoryList(),
      () => this.getDefaultTiddlers(),
    ]) {
      const tiddlers = tiddlerSource()
      if (tiddlers.length > 0) {
        return this.getViewStateFromOpenTiddlers(
          tiddlers,
          undefined,
          parsed.searchVariables,
          parsed.fragment);
      }
    }
    // fall back to displaying "GettingStarted" tiddler
    return this.getViewStateFromOpenTiddlers(
      [TW5_TITLE_GETTING_STARTED],
      undefined,
      parsed.searchVariables,
      parsed.fragment);
  }

  getWikiViewState():WikiViewState {
    return (
      // If the wikiViewState is set due to the History API already having the applicable ViewState, use it.
      (this.wiki.getTiddler(TIDDLYBASE_TITLE_PARENT_LOCATION)?.fields?.['wikiViewState'] as WikiViewState | undefined) ??
      // Otherwise, compute the WikiViewState from the parent iframe's URL.
      this.createWikiViewFromParentURL(this.getPathTemplate(), this.getParentURL()))
  }

  async initStory() {
    // The story state depends on the parent URL tiddler
    // which may contain a parent URL and possibly a wikiViewState object
    let wikiViewState = this.getWikiViewState();
    await this.applyWikiViewState(wikiViewState);
    return wikiViewState
  }

  updateHistory(storyList: string[], activeTiddler?: string) {
    // Save the story list
    // Update history
    var story = new this.Story({
      wiki: this.wiki,
      storyTitle: TW5_TITLE_STORY_LIST,
      historyTitle: TW5_TITLE_HISTORY_LIST
    });

    // If a target tiddler was specified add it to the history stack
    if (activeTiddler) {
      story.addToHistory(activeTiddler);
    } else if (storyList.length > 0) {
      story.addToHistory(storyList[0]);
    }
  }

}
