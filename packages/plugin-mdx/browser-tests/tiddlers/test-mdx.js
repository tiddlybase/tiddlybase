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

    const { initSpy, sleep, toJSON } = require('$:/plugins/tiddlybase/browser-test-utils/test-utils.js');

    const widget = require("$:/core/modules/widgets/widget.js");

    const markdownParser = require('$:/plugins/tiddlywiki/markdown/wrapper.js')["text/x-markdown"];

    const wikitextParser = $tw.Wiki.parsers["text/vnd.tiddlywiki"];

    const mdxParser = function (type, text, options) {
        this.tree = [
            {
                "type": "MDX",
                attributes: {
                    "mdx": { type: "string", value: text }
                }
            }
        ]
    };

    const renderToDOM = async (text, parserConstructor, wiki = new $tw.Wiki()) => {
        const parser = new parserConstructor(null, text, { wiki });
        const widgetNode = new widget.widget({ type: "widget", children: parser.tree }, {
            wiki: wiki,
            document: window.document
        });
        var wrapper = window.document.createElement("div");
        widgetNode.render(wrapper, null);
        // this sleep(0) forces async execution
        await sleep(0);
        return wrapper.firstChild;
    }

    const getElement = (dom, parserConstructor) => {
        if (parserConstructor === mdxParser) {
            // mdx parser has an extra <div> wrapper (the react container node)
            return dom.firstChild;
        }
        return dom;
    }

    const renderToHTML = async (text, parserConstructor, wiki = new $tw.Wiki()) => {
        return getElement(await (renderToDOM(text, parserConstructor, wiki)), parserConstructor).parentElement.innerHTML;
    }

    const renderToJSON = async (text, parserConstructor, wiki = new $tw.Wiki()) => {
        return toJSON(getElement(await (renderToDOM(text, parserConstructor, wiki)), parserConstructor));
    }

    const stripNewlines = str => str.replace(/(\r\n|\n|\r)/gm, "")

    describe("Parsing markdown", function () {

        it("should render headers as expected", async function () {
            expect(await renderToHTML("# foo", markdownParser)).toEqual("<h1>foo</h1>");
            expect(await renderToHTML("# foo", mdxParser)).toEqual("<h1>foo</h1>");
            expect(await renderToHTML("! foo", wikitextParser)).toEqual('<h1 class="">foo</h1>');
        });

        it("should render bold as expected", async function () {
            expect(await renderToHTML("**foo**", markdownParser)).toEqual("<p><strong>foo</strong></p>");
            expect(await renderToHTML("**foo**", mdxParser)).toEqual("<p><strong>foo</strong></p>");
            expect(await renderToHTML("''foo''", wikitextParser)).toEqual('<p><strong>foo</strong></p>');
        });

        it("should render italic as expected", async function () {
            expect(await renderToHTML("_foo_", markdownParser)).toEqual("<p><em>foo</em></p>");
            expect(await renderToHTML("_foo_", mdxParser)).toEqual("<p><em>foo</em></p>");
            expect(await renderToHTML("//foo//", wikitextParser)).toEqual('<p><em>foo</em></p>');
        });

        it("should render non-nested lists as expected", async function () {
            const lists = [`
- item1
- item2
- item3`.trim(),
            `
* item1
* item2
* item3`.trim(),
            `
+ item1
+ item2
+ item3
            `.trim()];
            const expected = `<ul>
<li>item1</li>
<li>item2</li>
<li>item3</li>
</ul>`
            for (let list of lists) {
                expect(await renderToHTML(list, markdownParser)).toEqual(stripNewlines(expected));
                expect(await renderToHTML(list, mdxParser)).toEqual(expected);
            }
        });

        it("should render nested lists as expected", async function () {
            const list = `
- item1
    - 1a
    - 1b
    - 1c
        - 1c1
- item2
    - 2a
- item3`.trim();
            const expectation = `<ul>
<li>item1
<ul>
<li>1a</li>
<li>1b</li>
<li>1c
<ul>
<li>1c1</li>
</ul>
</li>
</ul>
</li>
<li>item2
<ul>
<li>2a</li>
</ul>
</li>
<li>item3</li>
</ul>`;
            expect(await renderToHTML(list, markdownParser)).toEqual(stripNewlines(expectation));
            expect(await renderToHTML(list, mdxParser)).toEqual(expectation);
        });

        it("should render external links identically", async function () {
            const expected = {
                "nodeType": 1,
                "tagName": "p",
                "attributes": {},
                "nodeName": "P",
                "childNodes": [
                    {
                        "nodeType": 1,
                        "tagName": "a",
                        "attributes": {
                            "class": "tc-tiddlylink-external",
                            "href": "https://github.com/neumark/",
                            "rel": "noopener noreferrer",
                            "target": "_blank"
                        },
                        "nodeName": "A",
                        "childNodes": [
                            {
                                "nodeType": 3,
                                "nodeName": "#text",
                                "nodeValue": "neumark",
                                "childNodes": []
                            }
                        ]
                    }
                ]
            };
            const externalLinkMD = "[neumark](https://github.com/neumark/)";
            const wiki = new $tw.Wiki();
            expect(await renderToJSON(externalLinkMD, markdownParser, wiki)).toEqual(expected);
            expect(await renderToJSON(externalLinkMD, mdxParser, wiki)).toEqual(expected);
            expect(await renderToJSON("[[neumark|https://github.com/neumark/]]",wikitextParser, wiki)).toEqual(expected);
        });

    });


})();
