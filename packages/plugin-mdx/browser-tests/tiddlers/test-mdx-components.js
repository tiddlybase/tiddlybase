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

        beforeEach(() => {
            clearCallbacks();
        })

        it("should pass props to react component", async function () {
            const title = "mdxc1"
            const text = `import {TestComponent} from "$:/plugins/tiddlybase/browser-test-utils/TestComponent.js"

<TestComponent foo="bar">asdf</TestComponent>
`;
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


        it("should be able to import MDX tiddlers", async function () {
            const tiddlers = [
                { type, title: "mdxt3export", text: `import {TestComponent} from "$:/plugins/tiddlybase/browser-test-utils/TestComponent.js"
export const literal = 15
export const MyComponent = ({foo, asdf}) => (<div>
    <TestComponent foo={foo}>{asdf}</TestComponent>
</div>)`},
                { type, title: "mdxt3import", text: `import {MyComponent} from "mdxt3export"
import {withContext} from '$:/plugins/tiddlybase/react/components/TW5ReactContext.js';

export const NewComponent = withContext(({context, asdf}) => {
    console.log("NewComponent got context", context);
    return (<MyComponent asdf={asdf} foo={context?.parentWidget?.getVariable('currentTiddler') ?? 'unknown'} />);
});

<NewComponent asdf="fdsa"/>
`}
            ];
            $tw.wiki.addTiddlers(tiddlers);
            const onRenderPromise = new Promise(resolve => {
                addCallback(resolve);
            })
            openTiddler(tiddlers[1].title);
            await onRenderPromise;
            expect(getTiddlerDiv(tiddlers[1].title).querySelector('pre').innerText).toBe(`{"children":"fdsa","foo":"${tiddlers[1].title}"}`);
        });

    });

})();
