import type { } from "@tiddlybase/tw5-types/src/index";

import {
  applyWikiViewState,
  copyURLToClipboard,
  createPermaURL,
  onNavigation,
  getTiddlerArguments,
  getWikiViewState,
  updateAddressBar,
  getActiveTiddler,
  getClickedTiddlerTitle,
  setActiveTiddlerTitle,
  getPathTemplate,
  getParentURL,
  getStoryList,
  getDefaultTiddlers,
} from "./story-utils";
import {
  TIDDLYBASE_TITLE_PARENT_LOCATION,
  TW5_DEFAULT_START_TIDDLER,
  TW5_TITLE_DEFAULT_TIDDLERS,
  TW5_TITLE_HISTORY_LIST,
  TW5_TITLE_STORY_LIST
} from "@tiddlybase/shared/src/constants";
import { TiddlerViewState, WikiViewState, getTiddlerArgumentsTitle } from "@tiddlybase/shared/src/wiki-view-state";
import { PathTemplate } from "@tiddlybase/shared/src/path-template";
import { parseURL } from "@tiddlybase/shared/src/path-template-utils";
import { SearchVariables } from "@tiddlybase/shared/src/tiddlybase-config-schema";


export class StoryStartup {

  wiki: $tw.Wiki;
  hooks: typeof $tw.hooks;
  rootWidget: $tw.Widget;
  Story: typeof $tw.Story;

  constructor({
    wiki = globalThis.$tw.wiki,
    hooks = globalThis.$tw.hooks,
    rootWidget = globalThis.$tw.rootWidget,
    Story = globalThis.$tw.Story
  }: {
    wiki?: $tw.Wiki,
    hooks?: typeof $tw.hooks,
    rootWidget?: $tw.Widget,
    Story?: typeof $tw.Story
  } = {}) {
    this.wiki = wiki;
    this.hooks = hooks;
    this.rootWidget = rootWidget;
    this.Story = Story;
  }


  handleCopyPermalink(event: $tw.Widget.PermalinkEvent & $tw.WidgetDOMEventField) {
    const tiddler = event.param || event.tiddlerTitle;
    copyURLToClipboard(
      createPermaURL(
        {
          tiddler,
          // clear viewState if it was set
          viewState: ''
        },
        getTiddlerArguments(tiddler),
        // TODO: hash?
      ));
  }

  handleCopyPermaview() {
    copyURLToClipboard(
      createPermaURL({
        viewState: JSON.stringify(getWikiViewState()),
        // clear tiddler path template if it was set
        tiddler: ''
      }));
  }

  handleWikiChange(wikiChange: $tw.WikiChange) {
    // Update the wiki when the user clicks the browser's Back/Forward buttons
    if (TIDDLYBASE_TITLE_PARENT_LOCATION in wikiChange) {
      // if current parent location was set from within the wiki, do not update
      // the view state.
      if (this.wiki.getTiddler(TIDDLYBASE_TITLE_PARENT_LOCATION)?.fields?.['setFromWiki'] !== true) {
        const wikiViewState = this.getWikiViewStateFromParentLocationTiddler()
        if (wikiViewState) {
          applyWikiViewState(wikiViewState);
          return
        }
      }
    }
    let updateAddressBarRequired = false;
    // the address bar should be updated if the StoryList changed (unless it was changed
    // by us).
    if (TW5_TITLE_STORY_LIST in wikiChange) {
      // don't do anything if the change to StoryList was triggered by this code
      if (this.wiki.getTiddler(TW5_TITLE_STORY_LIST)?.fields?.setFromWikiViewState === this.wiki.changeCount[TW5_TITLE_STORY_LIST]) {
        return;
      }
      updateAddressBarRequired = true
    }
    // Update the address bar URL if the currently active tiddler's TiddlerArguments
    // changed
    const activeTiddler = getActiveTiddler();
    if (!updateAddressBarRequired && activeTiddler) {
      const argumentsTiddler = getTiddlerArgumentsTitle(activeTiddler)
      if (argumentsTiddler in wikiChange) {
        updateAddressBarRequired = true
      }
    }
    if (updateAddressBarRequired) {
      console.log("address bar update triggered by wiki change", activeTiddler, wikiChange);
      if (activeTiddler) {
        setActiveTiddlerTitle(activeTiddler);
      }
      updateAddressBar(
        { tiddler: activeTiddler ?? '' },
        activeTiddler ? getTiddlerArguments(activeTiddler) : undefined
        // TODO: hash
      );
    }

  }

  registerHandlers() {
    // Listen for the tm-browser-refresh message
    this.rootWidget.addEventListener("tm-browser-refresh", () => {
      window.location.reload();
    });

    // Listen to updates to the parent iframe URL
    this.wiki.addEventListener('change', this.handleWikiChange.bind(this));

    // Listen for navigate events and update addressbar accordingly
    this.hooks.addHook("th-navigating", event => {
      onNavigation(event.navigateTo);
      return event;
    });

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
      if (clickedTiddlerTitle && (getActiveTiddler() !== clickedTiddlerTitle)) {
        setActiveTiddlerTitle(clickedTiddlerTitle);
        updateAddressBar(
          { tiddler: clickedTiddlerTitle },
          getTiddlerArguments(clickedTiddlerTitle)
          // TODO: hash
        );
      }
    }
  }

  defaultTiddlersViewState(activeTiddler?: string): WikiViewState {
    var storyFilter = this.wiki.getTiddlerText(TW5_TITLE_DEFAULT_TIDDLERS),
      storyList = this.wiki.filterTiddlers(storyFilter!);
    //invoke any hooks that might change the default story list
    storyList = this.hooks.invokeHook("th-opening-default-tiddlers-list", storyList);
    // If the target tiddler isn't included then splice it in at the top
    if (activeTiddler && storyList.indexOf(activeTiddler) === -1) {
      storyList = [activeTiddler, ...storyList];
    }
    return {
      activeTiddler: activeTiddler || storyList[0],
      openTiddlers: storyList.map(title => ({ title }))
    }
  }

  private getViewStateFromOpenTiddlers(tiddlerList: string[], activeTiddler?: string, searchVariables?: SearchVariables):WikiViewState {
    const tiddlers = [...tiddlerList];
    let activeTiddlerIndex = 0;
    if (activeTiddler) {
      activeTiddlerIndex = tiddlers.indexOf(activeTiddler);
      if (activeTiddlerIndex < 0) {
        tiddlers.unshift(activeTiddler);
        activeTiddlerIndex = 0;
      }
    }
    const openTiddlers:TiddlerViewState[] = tiddlers.map(title => ({title}))
    if (searchVariables) {
      // set search variables as tiddlerArguments for active tiddler
      openTiddlers[activeTiddlerIndex].tiddlerArguments = searchVariables;
    }
    return {
      openTiddlers,
      activeTiddler: activeTiddler ?? tiddlers[0]
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
        getStoryList(this.wiki),
        parsed.pathVariables.tiddler,
        parsed.searchVariables);
    }
    // Case 3: No WikiViewState or active tiddler encoded in URL, use Wiki contents
    //         to determine which tiddler(s) to display.
    for (let tiddlerSource of [
      () => getStoryList(this.wiki),
      () => getDefaultTiddlers(this.wiki),
    ]) {
      const tiddlers = tiddlerSource()
      if (tiddlers.length > 0) {
        return this.getViewStateFromOpenTiddlers(
          tiddlers,
          undefined,
          parsed.searchVariables);
      }
    }
    // fall back to displaying "GettingStarted" tiddler
    return this.getViewStateFromOpenTiddlers(
      [TW5_DEFAULT_START_TIDDLER],
      undefined,
      parsed.searchVariables);
  }

  getWikiViewStateFromParentLocationTiddler(): WikiViewState | undefined {
    // If the wikiViewState has already been encoded in the parent location tiddler,
    // return it.
    let wikiViewState = this.wiki.getTiddler(TIDDLYBASE_TITLE_PARENT_LOCATION)?.fields?.['wikiViewState'] as WikiViewState | undefined;
    if (!wikiViewState) {
      // If there is no wikiViewState field, then construct the wikiViewState from the
      // URL and the contents of the wiki ($:/StoryList, $:/DefaultTiddlers, etc.)
      wikiViewState = this.createWikiViewFromParentURL(getPathTemplate(), getParentURL())
    }
    return wikiViewState;
  }

  async initStory() {
    // The story state depends on the parent URL tiddler
    // which may contain a parent URL and possibly a wikiViewState object
    let wikiViewState = this.getWikiViewStateFromParentLocationTiddler()
    if (!wikiViewState) {
      // No view state or tiddler in the url, return the default tiddlers
      wikiViewState = this.defaultTiddlersViewState();
    }
    await applyWikiViewState(wikiViewState);
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
