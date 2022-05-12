/*\
title: test-react-widget.js
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

    const { initSpy, openTiddler, sleep } = require('$:/plugins/tiddlybase/browser-test-utils/test-utils.js');

    const widget = require("$:/core/modules/widgets/widget.js");

    const TestReactWidget = require("$:/plugins/tiddlybase/generated/TestReactWidget.js").TestReactWidget;

    console.log("asdf");

    const getTiddlerDiv = title => {
        const results = document.querySelectorAll(`div[data-tiddler-title="${title}"]`);
        expect(results.length).toEqual(1);
        expect(results[0]).not.toBeNull();
        return results[0];
    }

    describe("Widget lifecycle", function () {

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

            initSpy(TestReactWidget.prototype, 'initReact');
            const { waitFor: waitForDestroy } = initSpy(TestReactWidget.prototype, 'destroy');
            const assertCalls = (initCalls, destroyCalls) => {
                expect(TestReactWidget.prototype.initReact).toHaveBeenCalledTimes(initCalls);
                expect(TestReactWidget.prototype.destroy).toHaveBeenCalledTimes(destroyCalls);
            }
            $tw.wiki.addTiddlers([
                { title: "B1", text: `<$TestReactWidget foo="bar" />` }
            ]);
            $tw.wiki.addTiddlers([
                { title: "B2", text: "{{B1}}" }
            ]);

            assertCalls(0, 0);

            let nextDestroyCall = waitForDestroy({ label: 'destroy B1' });
            await openTiddler("B1");
            assertCalls(1, 0);
            await openTiddler("B2");
            expect((await nextDestroyCall).label).toEqual('destroy B1');

            nextDestroyCall = waitForDestroy({ label: 'destroy B2' });
            assertCalls(2, 1);
            await openTiddler("Start");
            expect((await nextDestroyCall).label).toEqual('destroy B2');
            assertCalls(2, 2);
        });
    });

})();
