// Overrides https://github.com/Jermolene/TiddlyWiki5/blob/master/core/modules/startup/story.js
import type { } from "@tiddlybase/tw5-types/src/index";
import { StoryStartup } from "./story-startup";

// Export name and synchronous status
export const name = 'story';
export const after = ['startup'];
export const synchronous = true;


export const startup = function () {
  if ($tw.browser) {
    const storyStartup = new StoryStartup();
    storyStartup.registerHandlers()
    storyStartup.initStory().then(wikiViewState => {
      storyStartup.updateHistory(
        wikiViewState.openTiddlers.map(t => t.title),
        wikiViewState.activeTiddler
      );
      storyStartup.scrollToFragment(wikiViewState);
    })
  }

};
