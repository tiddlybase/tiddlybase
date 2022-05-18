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

    const getLinkElement = (tiddler, target) => document.querySelector(`div[data-tiddler-title="${tiddler}"] a[href="#${target}"]`)

    describe("Navigation with internal links", function () {

        it("Clicking on internal links navigates as expected", async function () {
            const target = "InternalLinkTarget";
            const source = "InternalLinkSource";
            $tw.wiki.addTiddlers([
                { title: source, text: `[[${target}]]`, type: "text/x-markdown"},
                { title: target, text: `- foo\n- bar`, type: "text/x-markdown"}
            ]);
            await openTiddler(source);
            const link = getLinkElement(source, target);
            expect(link).toBeTruthy();
            console.log('asdf');
            link.click();
            await sleep(0);
            expect(getCurrentTiddler()).toEqual(target);
        });

    });


})();
