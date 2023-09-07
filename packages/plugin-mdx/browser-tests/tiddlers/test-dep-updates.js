/*\
title: test-dep-updates.js
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

    const type = "text/x-markdown"

    const { openTiddler, sleep, getCurrentTiddler, getTiddlerDiv } = require('$:/plugins/tiddlybase/browser-test-utils/test-utils.js');

    const {addCallback, clearCallbacks} = require('$:/plugins/tiddlybase/browser-test-utils/TestComponent.js');

    describe("Dependency updates", function () {

        beforeEach(() => {
            clearCallbacks();
        })


        it("should be able to import MDX tiddlers", async function () {
            const tiddlers = [
                { type, title: "mdxdept1a", text: `
import {TestComponent} from "$:/plugins/tiddlybase/browser-test-utils/TestComponent.js"
import {default as d} from "mdxdept1b"

<TestComponent></TestComponent>

<div class="result">

# t1a
{d()}

</div>
`},
{ type, title: "mdxdept1b", text: `
import {default as d} from "mdxdept1c"

# t1b
{d()}
`},
{ type, title: "mdxdept1c", text: `
# t1cv1
`}
            ];
            console.log('a01');
            $tw.wiki.addTiddlers(tiddlers);
            const onRenderPromise = new Promise(resolve => {
                addCallback(resolve);
            })
            console.log('a02');
            openTiddler(tiddlers[0].title);
            console.log('a03');
            await onRenderPromise;
            console.log('a04');
            expect(getTiddlerDiv(tiddlers[0].title).querySelector('div.result').innerHTML).toEqual('<h1>t1a</h1><h1>t1b</h1>\n<h1>t1cv1</h1>');
            // now update a transitive dependency and verify the original tiddler is rerendered
            console.log('a05');
            const onRenderPromise2 = new Promise(resolve => {
                addCallback(resolve);
            })
            console.log('a06');
            $tw.wiki.addTiddlers([{
                ...tiddlers[2],
                text: `
# t1cv2
`
            }]);
            console.log('a07');
            await onRenderPromise2
            console.log('a08');
            expect(getTiddlerDiv(tiddlers[0].title).querySelector('div.result').innerHTML).toBe(`<h1>t1a</h1><h1>t1b</h1>\n<h1>t1cv2</h1>`);
            console.log('a09');
        });

    });

})();
