import type { } from "@tiddlybase/tw5-types/src/index";
// Based on Single Tiddler View plugin: https://yaisog-singletiddlerview.tiddlyhost.com/

interface ListWidget extends $tw.Widget {
	findListItem(startPos: number, title: string):number|undefined;
}

class MinimalStoryView {
	constructor(public listWidget: ListWidget) {}

	navigateTo (historyInfo:$tw.TiddlerFields) {
		var listElementIndex = this.listWidget.findListItem(0,historyInfo.title);
		if(listElementIndex === undefined) {
			return;
		}
		var listItemWidget = this.listWidget.children[listElementIndex],
			targetElement = listItemWidget.findFirstDomNode();
		// Abandon if the list entry isn't a DOM element (it might be a text node)
		if(!targetElement || targetElement.nodeType === Node.TEXT_NODE) {
			return;
		}
		targetElement.scrollIntoView();
	}

	remove(widget: $tw.Widget) {
		if(typeof (widget as any)['destroy'] === 'function') {
			(widget as any).destroy();
		} else {
			widget.removeChildDomNodes();
		}
	}
};

export const minimal = MinimalStoryView;
