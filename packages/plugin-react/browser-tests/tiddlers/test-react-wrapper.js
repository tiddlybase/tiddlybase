/*\
title: test-react-wrapper.js
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

    const { initSpy, openTiddler, sleep, getCurrentTiddler, getTiddlerDiv } = require('$:/plugins/tiddlybase/browser-test-utils/test-utils.js');

    const {addCallback, clearCallbacks} = require('$:/plugins/tiddlybase/browser-test-utils/TestComponent.js');

    const ReactWrapper = require('$:/plugins/tiddlybase/react/react-wrapper.js').ReactWrapper;

    beforeEach(() => {
        clearCallbacks();
    })

    describe("Widget lifecycle", function () {

        it("Opening tiddlers with dispatchEvent should work", async function () {
            const title = "TiddlerOne";
            $tw.wiki.addTiddlers([
                { title, text: "the quick brown fox" }
            ]);
            await openTiddler(title);
            expect(getTiddlerDiv(title)).not.toBeNull();
            expect(getCurrentTiddler()).toEqual(title);
        });

        it("should pass props to react component", async function () {
            const title = "props1"
            $tw.wiki.addTiddlers([
                { title, text: `<$ReactWrapper module="$:/plugins/tiddlybase/browser-test-utils/TestComponent.js" export="TestComponent" foo="bar" />` }
            ]);
            const onRenderPromise = new Promise(resolve => {
                addCallback(resolve);
            })
            openTiddler(title);
            await onRenderPromise;
            expect(getTiddlerDiv(title).querySelector('pre').innerText).toBe('{"foo":"bar"}');
        });

        it("Assert widget's destroy function called when removed from DOM", async function () {

            // Spies are created on the prototype of the
            initSpy(ReactWrapper.prototype, 'initReact');
            const { waitFor: waitForDestroy } = initSpy(ReactWrapper.prototype, 'destroy');
            const assertCalls = (initCalls, destroyCalls) => {
                expect(ReactWrapper.prototype.initReact).toHaveBeenCalledTimes(initCalls);
                expect(ReactWrapper.prototype.destroy).toHaveBeenCalledTimes(destroyCalls);
            }
            $tw.wiki.addTiddlers([
                { title: "B1", text: `<$ReactWrapper module="$:/plugins/tiddlybase/browser-test-utils/TestComponent.js" export="TestComponent"/>` }
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
