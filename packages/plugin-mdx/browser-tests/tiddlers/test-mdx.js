/*\
title: test-mdx.js
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

    const {findNavigator, initSpy, sleep, openTiddler} = require('$:/plugins/tiddlybase/browser-test-utils/test-utils.js');

    const getTiddlerDiv = title => {
        const results = document.querySelectorAll(`div[data-tiddler-title="${title}"]`);
        expect(results.length).toEqual(1);
        expect(results[0]).not.toBeNull();
        return results[0];
    }

    describe("Widget lifecycle", function () {

        const MDX = require('$:/plugins/tiddlybase/mdx/mdx-widget.js').MDX;

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

            initSpy(MDX.prototype, 'initReact');
            const {waitFor: waitForDestroy} = initSpy(MDX.prototype, 'destroy');
            const assertCalls = (initCalls, destroyCalls) => {
                expect(MDX.prototype.initReact).toHaveBeenCalledTimes(initCalls);
                expect(MDX.prototype.destroy).toHaveBeenCalledTimes(destroyCalls);
            }
            $tw.wiki.addTiddlers([
                { title: "B1", text: `<$MDX mdx="# h1" />` }
            ]);
            $tw.wiki.addTiddlers([
                { title: "B2", text: "{{B1}}" }
            ]);

            assertCalls(0,0);

            let nextDestroyCall = waitForDestroy({label: 'destroy B1'});
            await openTiddler("B1");
            assertCalls(1,0);
            await openTiddler("B2");
            expect((await nextDestroyCall).label).toEqual('destroy B1');

            nextDestroyCall = waitForDestroy({label: 'destroy B2'});
            assertCalls(2,1);
            await openTiddler("Start");
            expect((await nextDestroyCall).label).toEqual('destroy B2');
            assertCalls(2,2);
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
