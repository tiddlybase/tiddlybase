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

    const MDX = require('$:/plugins/tiddlybase/mdx/mdx-widget.js').MDX;

    const { initSpy, openTiddler, sleep } = require('$:/plugins/tiddlybase/browser-test-utils/test-utils.js');

    const getTiddlerDiv = title => {
        const results = document.querySelectorAll(`div[data-tiddler-title="${title}"]`);
        expect(results.length).toEqual(1);
        expect(results[0]).not.toBeNull();
        return results[0];
    }
    const widget = require("$:/core/modules/widgets/widget.js");
    const officialMarkdownParser = require('$:/plugins/tiddlywiki/markdown/wrapper.js')["text/x-markdown"]
    const mdxMarkdownParser = require('$:/plugins/tiddlybase/mdx/register-mdx-parser.js')["text/x-markdown"]

    const renderWithOfficialMarkdownPlugin = markdown => {
        const wiki = new $tw.Wiki();
        const parser = new officialMarkdownParser(null, markdown);
        const widgetNode = new widget.widget({ type: "widget", children: parser.tree }, {
            wiki: wiki,
            document: $tw.fakeDocument
        });
        var wrapper = $tw.fakeDocument.createElement("div");
        widgetNode.render(wrapper, null);
        return wrapper.innerHTML;
    }

    const MDXParser = function(type, text, options) {
        this.tree = [
          {
              "type": "element",
              "tag": "div",
              "children": [
                  {
                      "type": "MDX",
                      attributes: {
                        "mdx": { type: "string", value: text}
                      }
                  }
              ]
          }
      ]
      };

    const renderWithMDX = async mdx => {
        const wiki = new $tw.Wiki();
        const parser = new MDXParser(null, mdx);
        const widgetNode = new widget.widget({ type: "widget", children: parser.tree }, {
            wiki: wiki,
            document: window.document
        });
        var wrapper = window.document.createElement("div");
        console.log("wrapper node", wrapper);
        widgetNode.render(wrapper, null);
        await sleep(0);
        return wrapper.firstChild.firstChild.innerHTML;
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

            initSpy(MDX.prototype, 'initReact');
            const { waitFor: waitForDestroy } = initSpy(MDX.prototype, 'destroy');
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

        it("Assert basic markdown is rendered as expected by official plugin", async function () {
            expect(renderWithOfficialMarkdownPlugin("# foo")).toEqual("<h1>foo</h1>");
            expect(renderWithOfficialMarkdownPlugin("**foo**")).toEqual("<p><strong>foo</strong></p>");
            expect(renderWithOfficialMarkdownPlugin("> a quote")).toEqual("<blockquote><p>a quote</p></blockquote>");
            expect(renderWithOfficialMarkdownPlugin("_foo_")).toEqual("<p><em>foo</em></p>");
            expect(renderWithOfficialMarkdownPlugin(`
- item1
- item2
- item3
            `.trim())).toEqual("<ul><li>item1</li><li>item2</li><li>item3</li></ul>");
            expect(renderWithOfficialMarkdownPlugin(`
* item1
* item2
* item3
            `.trim())).toEqual("<ul><li>item1</li><li>item2</li><li>item3</li></ul>");
        });

        it("Assert mdx is rendered as expected by official plugin", async function () {
            console.log("asdf")
            expect(await renderWithMDX("# foo")).toEqual("<h1>foo</h1>");
            expect(await renderWithMDX("**foo**")).toEqual("<p><strong>foo</strong></p>");
            expect(await renderWithMDX("> a quote")).toEqual(`<blockquote>
<p>a quote</p>
</blockquote>`);
            expect(await renderWithMDX("_foo_")).toEqual("<p><em>foo</em></p>");
            expect(await renderWithMDX(`
- item1
- item2
- item3
            `.trim())).toEqual(`<ul>
<li>item1</li>
<li>item2</li>
<li>item3</li>
</ul>`);
            expect(await renderWithMDX(`
* item1
* item2
* item3
            `.trim())).toEqual(`<ul>
<li>item1</li>
<li>item2</li>
<li>item3</li>
</ul>`);
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
