/*\
title: test-internal-links.js
type: application/javascript
tags: [[$:/tags/test-spec]]

\*/
(function () {

    /*jslint node: true, browser: true */
    /*global $tw: false */
    "use strict";

    // these tests are browser-only
    if (!$tw.browser) {
        return
    }

    const { openTiddler, sleep, getCurrentTiddler } = require('$:/plugins/tiddlybase/browser-test-utils/test-utils.js');

    const {addCallback, clearCallbacks} = require('$:/plugins/tiddlybase/browser-test-utils/TestComponent.js');


    const getLinkElement = (tiddler, target) => document.querySelector(`div[data-tiddler-title="${tiddler}"] a[href="#${target}"]`)

    describe("Navigation with internal links", function () {

        beforeEach(() => {
            clearCallbacks();
        })

        it("Clicking on internal links navigates as expected", async function () {

            // testComponent is only included so that we can await on the react
            // component being rendered.

            const testComponentMDX = `import {TestComponent} from "$:/plugins/tiddlybase/browser-test-utils/TestComponent.js"

            <TestComponent />

            `
            const target = "InternalLinkTarget";
            const source = "InternalLinkSource";
            $tw.wiki.addTiddlers([
                { title: source, text: `${testComponentMDX}[[${target}]]`, type: "text/x-markdown"},
                { title: target, text: `${testComponentMDX}- foo\n- bar`, type: "text/x-markdown"}
            ]);


            let onRenderPromise = new Promise(resolve => {
                addCallback(resolve);
            })
            await openTiddler(source);
            await onRenderPromise;
            const link = getLinkElement(source, target);
            expect(link).toBeTruthy();
            onRenderPromise = new Promise(resolve => {
                addCallback(resolve);
            })
            link.click();
            await onRenderPromise;
            expect(getCurrentTiddler()).toEqual(target);
        });

    });


})();
