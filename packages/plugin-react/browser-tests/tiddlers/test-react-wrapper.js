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

    const { initSpy, openTiddler, closeAllTiddlers, closeTiddler, getCurrentTiddler, getTiddlerDiv } = require('$:/plugins/tiddlybase/browser-test-utils/test-utils.js');

    const {addCallback, clearCallbacks} = require('$:/plugins/tiddlybase/browser-test-utils/TestComponent.js');

    const {list: ListWidget} = require('$:/core/modules/widgets/list.js');

    const {ReactWrapper} = require('$:/plugins/tiddlybase/react/react-wrapper.js');

    let currentSpec = null;

    jasmine.getEnv().addReporter({
        specStarted: spec => {
            currentSpec = spec;
        },
        specDone: () => {
            currentSpec = null;
        }
    });

    beforeEach(async () => {
        clearCallbacks();
        return await closeAllTiddlers();
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
                { title, text: `<$ReactWrapper module="$:/plugins/tiddlybase/browser-test-utils/TestComponent.js" export="TestComponent" foo="props1" />` }
            ]);
            const onRenderPromise = new Promise(resolve => {
                addCallback(resolve);
            })
            openTiddler(title);
            await onRenderPromise;
            expect(getTiddlerDiv(title).querySelector('pre').innerText).toBe('{"foo":"props1"}');
        });

        it("Assert widget's destroy function called when removed from DOM with closeAllTiddlers", async function () {
            // Spies are created on the prototype of the
            const {calls: initReactCalls} = initSpy(ReactWrapper.prototype, 'initReact');
            const { waitFor: waitForDestroy, calls: destroyCalls } = initSpy(ReactWrapper.prototype, 'destroy');
            const callsFilter = calls => calls.filter(({target}) => target?.attributes?.foo === 'B1')
            const assertCalls = (initCallCount, destroyCallCount) => {
                expect(callsFilter(initReactCalls).length).toEqual(initCallCount);
                expect(callsFilter(destroyCalls).length).toEqual(destroyCallCount);
            }
            $tw.wiki.addTiddlers([
                { title: "B1", text: `<$ReactWrapper module="$:/plugins/tiddlybase/browser-test-utils/TestComponent.js" export="TestComponent" foo="B1"/>` }
            ]);

            assertCalls(0, 0);
            let nextDestroyCall = waitForDestroy({ label: 'destroy B1' });
            let onRenderPromise = new Promise(resolve => {
                addCallback(resolve);
            })
            await openTiddler("B1");
            await onRenderPromise;
            await closeAllTiddlers();
            let destroyCallData = await nextDestroyCall;
            expect(destroyCallData.label).toEqual('destroy B1');
            assertCalls(1,1);
        });


        it("Assert widget's destroy function called when tiddler transcluded (closeTiddler)", async function () {
            // Spies are created on the prototype of the
            const {calls: initReactCalls} = initSpy(ReactWrapper.prototype, 'initReact');
            const { waitFor: waitForDestroy, calls: destroyCalls } = initSpy(ReactWrapper.prototype, 'destroy');
            // this callsFilter is important because initReact and destroy calls initiated by other tests
            // may be registered while this test is running.
            const callsFilter = calls => calls.filter(({target}) => target?.attributes?.foo === 'C1')
            const assertCalls = (initCallCount, destroyCallCount) => {
                expect(callsFilter(initReactCalls).length).toEqual(initCallCount);
                expect(callsFilter(destroyCalls).length).toEqual(destroyCallCount);
            }
            $tw.wiki.addTiddlers([
                { title: "C1", text: `<$ReactWrapper module="$:/plugins/tiddlybase/browser-test-utils/TestComponent.js" export="TestComponent" foo="C1"/>` }
            ]);
            $tw.wiki.addTiddlers([
                { title: "C2", text: "{{C1}}" }
            ]);

            assertCalls(0, 0);
            let nextDestroyCall = waitForDestroy({ label: 'destroy C2' });
            let onRenderPromise = new Promise(resolve => {
                addCallback(resolve);
            })
            await openTiddler("C2");
            await onRenderPromise;
            await closeTiddler("C2")
            let destroyCallData = await nextDestroyCall;
            expect(destroyCallData.label).toEqual('destroy C2');
            assertCalls(1, 1);
        });

        it("Assert widget's destroy function called when widget removed from tiddler", async function () {
            // Tiddler isn't closed, but the react widget within the tiddler is removed

            // Spies are created on the prototype of the
            const {calls: initReactCalls} = initSpy(ReactWrapper.prototype, 'initReact');
            const {calls: refreshCalls} = initSpy(ListWidget.prototype, 'refresh', {qualifier: ({target}) => target?.attributes?.filter === '[tag[includeD1]]'});
            const {calls: removeChildDomNodesCalls} = initSpy(ReactWrapper.prototype, 'removeChildDomNodes', {qualifier: ({target}) => target?.attributes?.foo === 'D1'});
            const { waitFor: waitForDestroy, calls: destroyCalls } = initSpy(ReactWrapper.prototype, 'destroy', {qualifier: ({target}) => target?.attributes?.foo === 'D1'});
            // this callsFilter is important because initReact and destroy calls initiated by other tests
            // may be registered while this test is running.
            const callsFilter = calls => calls.filter(({target}) => target?.attributes?.foo === 'D1')
            const assertCalls = (initCallCount, destroyCallCount) => {
                expect(callsFilter(initReactCalls).length).toEqual(initCallCount);
                expect(callsFilter(destroyCalls).length).toEqual(destroyCallCount);
            }
            const tiddlers = [
                { title: "D1",
                  text: `<$ReactWrapper module="$:/plugins/tiddlybase/browser-test-utils/TestComponent.js" export="TestComponent" foo="D1"/>`,
                  tags: ['includeD1'],
                },
                { title: "D2",
                  text: `
                    <$list filter="[tag[includeD1]]">
                        <$transclude />
                    </$list>`
                }
            ];
            $tw.wiki.addTiddlers(tiddlers);

            assertCalls(0, 0);
            let nextDestroyCall = waitForDestroy({ label: 'destroy D2' });
            let onRenderPromise = new Promise(resolve => {
                addCallback(resolve);
            })
            await openTiddler("D2");
            await onRenderPromise;
            assertCalls(1, 0);
            // remove tag, forcing tiddler to refresh, removing react-wrapper widget
            $tw.wiki.addTiddlers([Object.assign({}, tiddlers[0], {tags: []})])
            let destroyCallData = await nextDestroyCall;
            expect(destroyCallData.label).toEqual('destroy D2');
            // refresh call was made to parent tiddler
            // assert that the tiddler list widget which had it's refresh() invoked
            // belongs to D2 and was passed in D1 it's changedTiddler argument.
            expect(refreshCalls.length).toEqual(1);
            expect(refreshCalls[0].args).toEqual([{'D1': { modified: true }}]);
            expect(refreshCalls[0].target?.parentDomNode?.parentNode?.parentNode?.getAttribute('data-tiddler-title')).toEqual('D2')
            // removeChildDomNodes called by $list widget when child removed
            expect(removeChildDomNodesCalls.length).toEqual(1);
        });

    });

})();
