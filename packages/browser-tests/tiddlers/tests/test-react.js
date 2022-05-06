/*\
title: test-react.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests the wikitext rendering pipeline end-to-end. We also need tests that individually test parsers, rendertreenodes etc., but this gets us started.

\*/
(function () {

    /*jslint node: true, browser: true */
    /*global $tw: false */
    "use strict";

    // these tests are browser-only
    if (!$tw.browser) {
        return
    }

    const findNavigator = (parent = $tw.rootWidget) => {
        const isNavigator = child => child?.parseTreeNode?.type === 'navigator'
        for (let child of parent.children || []) {
            if (isNavigator(child)) {
                // console.log("found navigator as child", child);
                return child;
            }
            // console.log("searching for navigator in children");
            const descendent = findNavigator(child);
            if (descendent) {
                return descendent;
            }

        }
    }

    const tw5Navigator = findNavigator();

    const openTiddler = async navigateTo => {
        tw5Navigator.dispatchEvent({type: "tm-close-all-tiddlers"});
        tw5Navigator.dispatchEvent({type: "tm-navigate", navigateTo})
        // force interruption of this function so that tiddlywiki events can be dispatched and acted upon.
        return await sleep(0);
    };

    const getTiddlerDiv = title => {
        const results = document.querySelectorAll(`div[data-tiddler-title="${title}"]`);
        expect(results.length).toEqual(1);
        expect(results[0]).not.toBeNull();
        return results[0];
    }

    const sleep = async (ms=1000) => new Promise(resolve => setTimeout(resolve, ms));

    describe("Widget lifecycle", function () {

        var widget = require("$:/core/modules/widgets/widget.js");
        const MDX = $tw.modules.titles['$:/plugins/tiddlybase/mdx/mdx-widget.js'].exports.MDX;

        function createWidgetNode(parseTreeNode, wiki) {
            return new widget.widget(parseTreeNode, {
                wiki: wiki,
                document: window.document
            });
        }

        function renderWidgetNode(widgetNode) {
            var wrapper = window.document.createElement("div");
            widgetNode.render(wrapper, null);
            return wrapper;
        }

        function refreshWidgetNode(widgetNode, wrapper, changes) {
            var changedTiddlers = {};
            if (changes) {
                $tw.utils.each(changes, function (title) {
                    changedTiddlers[title] = true;
                });
            }
            widgetNode.refresh(changedTiddlers, wrapper, null);
            // console.log(require("util").inspect(wrapper,{depth: 8}));
        }

        it("Opening tiddlers with dispatchEvent should work", async function () {
            const title = "TiddlerOne";
            $tw.wiki.addTiddlers([
                { title, text: "the quick brown fox" }
            ]);
            await openTiddler(title);
            expect(getTiddlerDiv(title)).not.toBeNull();
            expect($tw.wiki.getTiddler('$:/HistoryList').fields['current-tiddler']).toEqual(title);
        });

        it("Assert widget lifecycle hooks called", async function () {
            spyOn(widget.widget.prototype, 'refresh').and.callThrough();
            // spyOn(MDX.prototype, 'refresh').and.callThrough();
            $tw.wiki.addTiddlers([
                { title: "B1", text: `<$MDX mdx="# h1" />` }
            ]);
            $tw.wiki.addTiddlers([
                { title: "B2", text: "the quick brown fox" }
            ]);
            await openTiddler("B1");
            console.log("asdf");
            // spay on the prototype, from: https://stackoverflow.com/a/46317148
            expect(widget.widget.prototype.refresh).toHaveBeenCalledTimes(4);
            // TODO: react root should be unmounted here...
            await openTiddler("B2");
        });

        /*
        it("should deal with transclude widgets and indirect attributes", function () {
            var wiki = new $tw.Wiki();
            // Add a tiddler
            wiki.addTiddlers([
                { title: "TiddlerOne", text: "the quick brown fox" }
            ]);
            // Test parse tree
            var parseTreeNode = {
                type: "widget", children: [
                    { type: "MDX", text: "A text node" },
                ]
            };
            // Construct the widget node
            var widgetNode = createWidgetNode(parseTreeNode, wiki);
            // Render the widget node to the DOM
            var wrapper = renderWidgetNode(widgetNode);
            // Test the rendering
            expect(wrapper.innerHTML).toBe("A text node<div class=\"myClass\" title=\"the quick brown fox\"> and the content of a DIV<div> and an inner DIV</div> and back in the outer DIVthe quick brown fox</div>the quick brown fox");
            // Change the transcluded tiddler
            wiki.addTiddler({ title: "TiddlerOne", text: "jumps over the lazy dog" });
            // Refresh
            refreshWidgetNode(widgetNode, wrapper, ["TiddlerOne"]);
            // Test the refreshing
            expect(wrapper.innerHTML).toBe("A text node<div class=\"myClass\" title=\"jumps over the lazy dog\"> and the content of a DIV<div> and an inner DIV</div> and back in the outer DIVjumps over the lazy dog</div>jumps over the lazy dog");
        });
        */

    });

})();
