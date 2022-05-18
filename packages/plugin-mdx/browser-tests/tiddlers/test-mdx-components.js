/*\
title: test-mdx-components.js
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

    describe("MDX components (props, import, export)", function () {

        it("should pass props to react component", async function () {
            const title = "mdxc1"
            const text = `import {TestComponent} from "$:/plugins/tiddlybase/browser-test-utils/TestComponent.js"

<TestComponent foo="bar">asdf</TestComponent>`;
            $tw.wiki.addTiddlers([
                { title, text, type}
            ]);
            const onRenderPromise = new Promise(resolve => {
                addCallback(resolve);
            })
            openTiddler(title);
            await onRenderPromise;
            expect(getTiddlerDiv(title).querySelector('pre').innerText).toBe('{"children":"asdf","foo":"bar"}');
        });
    });

})();
