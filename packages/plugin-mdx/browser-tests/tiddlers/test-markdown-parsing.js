/*\
title: test-markdown-parsing.js
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

    const { sleep, toJSON } = require('$:/plugins/tiddlybase/browser-test-utils/test-utils.js');

    const widget = require("$:/core/modules/widgets/widget.js");

    const markdownParser = require('$:/plugins/tiddlywiki/markdown/wrapper.js')['text/x-markdown'];

    const wikitextParser = $tw.Wiki.parsers["text/vnd.tiddlywiki"];

    const mdxParser = require("$:/plugins/tiddlybase/mdx/parser.js")['text/x-markdown'];

    const renderToDOM = async (text, parserConstructor, wiki = new $tw.Wiki()) => {
        const parser = new parserConstructor(null, text, { wiki });
        const widgetNode = new widget.widget({ type: "widget", children: parser.tree }, {
            wiki: wiki,
            document: window.document
        });
        var wrapper = window.document.createElement("div");
        widgetNode.render(wrapper, null);
        if (parserConstructor === mdxParser) {
            // mdx is rendered async
            // try 5 times to get render output
            for (let i = 0; i < 5; i++) {
                await sleep(0);
                if (wrapper?.firstChild?.firstChild) {
                    break;
                }
            }
        }
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
        return getElement(await (renderToDOM(text, parserConstructor, wiki)), parserConstructor).outerHTML;
    }

    const renderToJSON = async (text, parserConstructor, wiki = new $tw.Wiki()) => {
        return toJSON(getElement(await (renderToDOM(text, parserConstructor, wiki)), parserConstructor));
    }

    const stripNewlines = str => str.replace(/(\r\n|\n|\r)/gm, "")

    const assertRendersTo = async (parser, input, expectedOutput) => expect(
        stripNewlines(
            await renderToHTML(input, parser))).toEqual(stripNewlines(expectedOutput));

    const assertRenderTree = async (wiki, parser, input, expectedOutput) => {
        const actualOutput = await renderToJSON(input, parser, wiki);
        console.log("assertRenderTree", actualOutput, expectedOutput);
        expect(actualOutput).toEqual(expectedOutput);
        // nodeType: 3, nodeName: '#text', nodeValue: ' ', childNodes: [  ]
    }

    describe("Parsing markdown", function () {

        it("should render headers as expected", async function () {
            await assertRendersTo(markdownParser, "# foo\n", "<h1>foo</h1>");
            await assertRendersTo(mdxParser, "# foo\n", "<h1>foo</h1>");
            await assertRendersTo(wikitextParser, "! foo\n", '<h1 class="">foo</h1>');
        });

        it("should render bold as expected", async function () {
            await assertRendersTo(markdownParser, "**foo**\n", "<p><strong>foo</strong></p>");
            await assertRendersTo(mdxParser, "**foo**\n", "<p><strong>foo</strong></p>");
            await assertRendersTo(wikitextParser, "''foo''\n", '<p><strong>foo</strong></p>');
        });

        it("should render italic as expected", async function () {
            await assertRendersTo(markdownParser, "_foo_\n", "<p><em>foo</em></p>");
            await assertRendersTo(mdxParser, "_foo_\n", "<p><em>foo</em></p>");
            await assertRendersTo(wikitextParser, "//foo//\n", '<p><em>foo</em></p>');
        });

        it("should render non-nested lists as expected", async function () {
            const lists = [`
- item1
- item2
- item3`.trim() + '\n',
            `
* item1
* item2
* item3`.trim() + '\n',
            `
+ item1
+ item2
+ item3
            `.trim() + '\n'];
            const expected = `<ul>
<li>item1</li>
<li>item2</li>
<li>item3</li>
</ul>
`
            for (let list of lists) {
                await assertRendersTo(markdownParser, list, expected);
                await assertRendersTo(mdxParser, list, expected);
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
- item3`.trim() + '\n';
            const expected = `<ul>
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
</ul>
`;
            await assertRendersTo(markdownParser, list, expected);
            await assertRendersTo(mdxParser, list, expected);
        });

        it("should render external links identically", async function () {
            const expected = {
                "nodeType": 1,
                "tagName": "p",
                "attributes": {},
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

        it("should render internal link to existing tiddlers identically", async function () {
            const expected = {
                "nodeType": 1,
                "tagName": "p",
                "attributes": {},
                "childNodes": [
                    {
                        "nodeType": 1,
                        "tagName": "a",
                        "attributes": {
                            "class": "tc-tiddlylink tc-tiddlylink-resolves",
                            "href": "#MyTiddler"
                        },
                        "childNodes": [
                            {
                                "nodeType": 3,
                                "nodeName": "#text",
                                "nodeValue": "Displayed Link Title",
                                "childNodes": []
                            }
                        ]
                    }
                ]
            };
            const wiki = new $tw.Wiki();
            wiki.addTiddler({
                title: "MyTiddler",
                text: "asdf"
            })
            const input = "[[Displayed Link Title|MyTiddler]]";
            await assertRenderTree(wiki, wikitextParser, input, expected);
            await assertRenderTree(wiki, mdxParser, input, expected);
        });

        it("should render internal link to existing tiddlers with space in title correctly", async function () {
            const expected = {
                "nodeType": 1,
                "tagName": "p",
                "attributes": {},
                "childNodes": [
                    {
                        "nodeType": 1,
                        "tagName": "a",
                        "attributes": {
                            "class": "tc-tiddlylink tc-tiddlylink-resolves",
                            "href": "#My%20Tiddler"
                        },
                        "childNodes": [
                            {
                                "nodeType": 3,
                                "nodeName": "#text",
                                "nodeValue": "Displayed Link Title",
                                "childNodes": []
                            }
                        ]
                    }
                ]
            };
            const wiki = new $tw.Wiki();
            wiki.addTiddler({
                title: "My Tiddler",
                text: "asdf"
            });
            const input = "[[Displayed Link Title|My Tiddler]]";
            await assertRenderTree(wiki, wikitextParser, input, expected);
            await assertRenderTree(wiki, mdxParser, input, expected);
        });

    });


})();
