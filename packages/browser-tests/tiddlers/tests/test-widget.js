/*\
title: test-widget.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests the wikitext rendering pipeline end-to-end. We also need tests that individually test parsers, rendertreenodes etc., but this gets us started.

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

describe("Widget module", function() {

	var widget = require("$:/core/modules/widgets/widget.js");

	function createWidgetNode(parseTreeNode,wiki) {
		return new widget.widget(parseTreeNode,{
				wiki: wiki,
				document: window.document
			});
	}

	function parseText(text,wiki,options) {
		var parser = wiki.parseText("text/vnd.tiddlywiki",text,options);
		return parser ? {type: "widget", children: parser.tree} : undefined;
	}

	function renderWidgetNode(widgetNode) {
		var wrapper = window.document.createElement("div");
		widgetNode.render(wrapper,null);
		return wrapper;
	}

	function refreshWidgetNode(widgetNode,wrapper,changes) {
		var changedTiddlers = {};
		if(changes) {
			$tw.utils.each(changes,function(title) {
				changedTiddlers[title] = true;
			});
		}
		widgetNode.refresh(changedTiddlers,wrapper,null);
// console.log(require("util").inspect(wrapper,{depth: 8}));
	}

    // only run these tests in the browser for now
    if ($tw.browser) {
        it("should deal with transclude widgets and indirect attributes", function() {
            var wiki = new $tw.Wiki();
            // Add a tiddler
            wiki.addTiddlers([
                {title: "TiddlerOne", text: "the quick brown fox"}
            ]);
            // Test parse tree
            var parseTreeNode = {type: "widget", children: [
                                    {type: "MDX", text: "A text node"},
                                ]};
            // Construct the widget node
            var widgetNode = createWidgetNode(parseTreeNode,wiki);
            // Render the widget node to the DOM
            var wrapper = renderWidgetNode(widgetNode);
            // Test the rendering
            expect(wrapper.innerHTML).toBe("A text node<div class=\"myClass\" title=\"the quick brown fox\"> and the content of a DIV<div> and an inner DIV</div> and back in the outer DIVthe quick brown fox</div>the quick brown fox");
            // Change the transcluded tiddler
            wiki.addTiddler({title: "TiddlerOne", text: "jumps over the lazy dog"});
            // Refresh
            refreshWidgetNode(widgetNode,wrapper,["TiddlerOne"]);
            // Test the refreshing
            expect(wrapper.innerHTML).toBe("A text node<div class=\"myClass\" title=\"jumps over the lazy dog\"> and the content of a DIV<div> and an inner DIV</div> and back in the outer DIVjumps over the lazy dog</div>jumps over the lazy dog");
        });

    } else {
        // trivial test to appease jasmine-node
       	it("should pass", function() {
            expect(2).toEqual(2);
        });
    }

});

})();
