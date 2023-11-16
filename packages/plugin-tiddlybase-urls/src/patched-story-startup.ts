// Overrides https://github.com/Jermolene/TiddlyWiki5/blob/master/core/modules/startup/story.js
import type { } from "@tiddlybase/tw5-types/src/index";

import {
  applyWikiViewState,
  copyURLToClipboard,
  createPermaURL,
  onNavigation,
  parseParentURL,
  getTiddlerArguments,
  getWikiViewState,
  updateAddressBar,
  getActiveTiddler,
} from "./plugin-shared"
import {
  TIDDLYBASE_TITLE_PARENT_LOCATION,
  TW5_TITLE_DEFAULT_TIDDLERS,
  TW5_TITLE_HISTORY_LIST,
  TW5_TITLE_STORY_LIST
} from "@tiddlybase/shared/src/constants";
import { WikiViewState, getTiddlerArgumentsTitle } from "@tiddlybase/shared/src/wiki-view-state";

// Export name and synchronous status
export const name = 'story';
export const after = ['startup'];
export const synchronous = true;

// Links to help, if there is no param
const HELP_OPEN_EXTERNAL_WINDOW = "http://tiddlywiki.com/#WidgetMessage%3A%20tm-open-external-window";

class PatchStoryStartup {
  tw: typeof $tw;
  constructor(tw: typeof $tw = globalThis.$tw) {
    this.tw = tw;
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
      const wikiViewState = this.getWikiViewStateFromParentLocationTiddler()
      if (wikiViewState) {
        applyWikiViewState(wikiViewState);
        return
      }
    }
    let updateAddressBarRequired = false;
    if (TW5_TITLE_STORY_LIST in wikiChange) {
      updateAddressBarRequired = true
    }
    // Update the address bar URL if the currently active tiddler's TiddlerArguments
    // change
    const activeTiddler = getActiveTiddler();
    if (!updateAddressBarRequired && activeTiddler) {
      const argumentsTiddler = getTiddlerArgumentsTitle(activeTiddler)
      if (argumentsTiddler in wikiChange) {
        updateAddressBarRequired = true
      }
    }
    if (updateAddressBarRequired) {
      updateAddressBar(
        { tiddler: activeTiddler ?? '' },
        activeTiddler ? getTiddlerArguments(activeTiddler) : undefined
        // TODO: hash
      );
    }

  }

  registerHandlers() {
    // Listen for the tm-browser-refresh message
    this.tw.rootWidget.addEventListener("tm-browser-refresh", () => {
      window.location.reload();
    });

    // Listen to updates to the parent iframe URL
    this.tw.wiki.addEventListener('change', this.handleWikiChange.bind(this));

    // Listen for navigate events and update addressbar accordingly
    this.tw.hooks.addHook("th-navigating", event => {
      onNavigation(event.navigateTo);
      return event;
    });

    // Listen for tm-open-external-window message
    this.tw.rootWidget.addEventListener("tm-open-external-window", (event: $tw.Widget.OpenExternalWindowEvent) => {
      var paramObject = event.paramObject || {},
        strUrl = event.param || HELP_OPEN_EXTERNAL_WINDOW,
        strWindowName = paramObject.windowName,
        strWindowFeatures = paramObject.windowFeatures;
      window.open(strUrl, strWindowName, strWindowFeatures);
    });
    // Listen for the tm-print message
    this.tw.rootWidget.addEventListener("tm-print", event => {
      ((event.event as any)?.view || window).print();
    });
    // Listen for the tm-home message
    this.tw.rootWidget.addEventListener("tm-home", () => {
      var storyFilter = this.tw.wiki.getTiddlerText(TW5_TITLE_DEFAULT_TIDDLERS),
        storyList = this.tw.wiki.filterTiddlers(storyFilter!);
      //invoke any hooks that might change the default story list
      storyList = this.tw.hooks.invokeHook("th-opening-default-tiddlers-list", storyList);
      this.tw.wiki.addTiddler({
        title: TW5_TITLE_STORY_LIST,
        text: "",
        list: storyList,
        ...this.tw.wiki.getModificationFields()
      });
      if (storyList[0]) {
        this.tw.wiki.addToHistory(storyList[0]);
      }
    });
    // Listen for the tm-permalink message
    this.tw.rootWidget.addEventListener("tm-permalink", event => {
      this.handleCopyPermalink(event)
    });
    // Listen for the tm-permaview message
    this.tw.rootWidget.addEventListener("tm-permaview", () => {
      this.handleCopyPermaview()
    });
  }

  defaultTiddlersViewState(activeTiddler?: string): WikiViewState {
    var storyFilter = this.tw.wiki.getTiddlerText(TW5_TITLE_DEFAULT_TIDDLERS),
      storyList = this.tw.wiki.filterTiddlers(storyFilter!);
    //invoke any hooks that might change the default story list
    storyList = this.tw.hooks.invokeHook("th-opening-default-tiddlers-list", storyList);
    // If the target tiddler isn't included then splice it in at the top
    if (activeTiddler && storyList.indexOf(activeTiddler) === -1) {
      storyList = [activeTiddler, ...storyList];
    }
    return {
      activeTiddler,
      openTiddlers: storyList.map(title => ({ title }))
    }
  }

  createWikiViewFromParentURL(): WikiViewState | undefined {
    const parsed = parseParentURL();
    if (parsed.pathVariables.viewState) {
      // the URL contains a viewstate, return it, we're done!
      return JSON.parse(parsed.pathVariables.viewState)
    }
    if (parsed.pathVariables.tiddler) {
      return {
        activeTiddler: parsed.pathVariables.tiddler,
        openTiddlers: [{
          title: parsed.pathVariables.tiddler,
          tiddlerArguments: parsed.searchVariables
        }]
      }
    }
    return undefined;
  }

  getWikiViewStateFromParentLocationTiddler(): WikiViewState | undefined {
    let wikiViewState = this.tw.wiki.getTiddler(TIDDLYBASE_TITLE_PARENT_LOCATION)?.fields?.['wikiViewState'] as WikiViewState | undefined;
    if (!wikiViewState) {
      wikiViewState = this.createWikiViewFromParentURL()
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

  updateStoryAndHistory(storyList: string[], activeTiddler?: string) {
    // Save the story list
    this.tw.wiki.addTiddler({
      title: TW5_TITLE_STORY_LIST,
      text: "",
      list: storyList,
      ...this.tw.wiki.getModificationFields()
    });
    // Update history
    var story = new this.tw.Story({
      wiki: this.tw.wiki,
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


export const startup = function () {
  if ($tw.browser) {
    const patchStoryStartup = new PatchStoryStartup();
    patchStoryStartup.registerHandlers()
    patchStoryStartup.initStory().then(wikiViewState => {
      patchStoryStartup.updateStoryAndHistory(
        wikiViewState.openTiddlers.map(t => t.title),
        wikiViewState.activeTiddler
      );
    })
  }

};
