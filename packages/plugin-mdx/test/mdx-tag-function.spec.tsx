import type {} from "@tiddlybase/tw5-types/src/index";
import React from "react";
import { setup } from "./mdx-test-utils";

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { constructMDXContent } from "../src/widget/mdx-tag-function";
import { ModuleExportsResult } from "../src/widget/mdx-module-loader";
import { toJSON } from "@tiddlybase/plugin-browser-test-utils/src/tojson";

const assertElementVisible = async (Component: React.FC, text: string) => {
  render(<Component />);
  expect(await screen.findByText(text)).toBeVisible();
};

const getRendered = async (result: ModuleExportsResult, waitForText:string) => {
  if ("moduleExports" in result) {
    if ("default" in result.moduleExports) {
      const Component = result.moduleExports.default;
      const renderer = render(<Component />);
      expect(await screen.findByText(waitForText)).toBeVisible();
      return renderer.container;
    }
  }
  throw new Error("no default export found!");
};

describe("tagged literal MDX construction", () => {
  it("handles case without bound values", async function () {
    expect(constructMDXContent(["hello"])).toEqual("hello");
  });
  it("handles case with a single bound values", async function () {
    expect(constructMDXContent(["foo", "bar"])).toEqual(
      "foo{props.literalBoundValues[0]}bar"
    );
  });
});

describe("MDX tag function", () => {
  it("invoke dynamically created mdx in same tidder", async function () {
    // Since mdx literal component compilation is awaited in
    // MDXModuleLoader.getModuleExports(),
    const { loader } = setup({
      tiddler1: `export const Dynamic_content = mdx\`*hello*\`;

<Dynamic_content />
`,
    });
    const result = await loader.loadModule({
      tiddler: "tiddler1",
    });
    expect(Object.keys(result)).toContain("moduleExports");
    if ("moduleExports" in result) {
      // the compilation of the MDX literal is awaited during the compilation
      // of tiddler1, so "loading..." is never displayed.
      await assertElementVisible(result.moduleExports.default, "hello");

      const savedCompilationResult = await loader.getCompilationResult(
        "tiddler1"
      );
      expect(savedCompilationResult).not.toBeFalsy();

      expect(Object.keys(savedCompilationResult ?? {}).sort()).toEqual([
        "compiledFn",
        "dependencies",
        "mdx",
        "moduleExports",
        "warnings",
      ]);
      if (savedCompilationResult && "moduleExports" in savedCompilationResult) {
        expect(savedCompilationResult.moduleExports).toEqual(
          result.moduleExports
        );
        expect(
          savedCompilationResult.moduleExports.Dynamic_content
        ).not.toBeUndefined();
        expect(
          savedCompilationResult.moduleExports.Dynamic_content.exports.default
        ).not.toBeUndefined();
        expect(
          savedCompilationResult.moduleExports.Dynamic_content.compilationResult
        ).toEqual(
          expect.objectContaining({
            warnings: [],
            dependencies: new Set<string>([]),
            mdx: "*hello*",
          })
        );
      }
    }
  });

  it("literal mdx supports embedded bound values", async function () {
    const { loader } = setup({
      tiddler1: `
export const num = 15;
export const str = "asdf";
export const Dynamic_content = mdx\`*hello \${num} and \${str}*\`;

<Dynamic_content />
`,
    });
    const result = await loader.loadModule({
      tiddler: "tiddler1",
    });
    expect(Object.keys(result)).toContain("moduleExports");
    if ("moduleExports" in result) {
      // Since mdx literal component compilation is awaited in
      // MDXModuleLoader.getModuleExports(), the compilation of the MDX literal is
      // awaited during the compilation // of tiddler1, so "loading..." is never
      // displayed.
      await assertElementVisible(
        result.moduleExports.default,
        "hello 15 and asdf"
      );

      const savedCompilationResult = await loader.getCompilationResult(
        "tiddler1"
      );
      expect(savedCompilationResult).not.toBeFalsy();

      expect(Object.keys(savedCompilationResult ?? {}).sort()).toEqual([
        "compiledFn",
        "dependencies",
        "mdx",
        "moduleExports",
        "warnings",
      ]);
      if (savedCompilationResult && "moduleExports" in savedCompilationResult) {
        expect(savedCompilationResult.moduleExports).toEqual(
          result.moduleExports
        );
        expect(
          savedCompilationResult.moduleExports.Dynamic_content
        ).not.toBeUndefined();
        expect(
          savedCompilationResult.moduleExports.Dynamic_content.exports.default
        ).not.toBeUndefined();
        expect(
          savedCompilationResult.moduleExports.Dynamic_content.compilationResult
        ).toEqual(
          expect.objectContaining({
            warnings: [],
            dependencies: new Set<string>([]),
            mdx: "*hello {props.literalBoundValues[0]} and {props.literalBoundValues[1]}*",
          })
        );
      }
    }
  });

  it("literal mdx with embedded react component", async function () {
    const { loader } = setup({
      tiddler2: `<span>*website*</span>`,
      tiddler1: `
import {default as website} from 'tiddler2'
export const content = mdx\`welcome to my \${website()}\`;

{content()}
`,
    });
    const container = await getRendered(
      await loader.loadModule({ tiddler: "tiddler1" }),
      'website'
    );
    expect(toJSON(container)).toEqual({
      nodeType: 1,
      tagName: "div",
      attributes: {},
      childNodes: [
        {
          nodeType: 1,
          tagName: "p",
          attributes: {},
          childNodes: [
            {
              nodeType: 3,
              nodeName: "#text",
              nodeValue: "welcome to my ",
              childNodes: [],
            },
            {
              nodeType: 1,
              tagName: "span",
              attributes: {},
              childNodes: [
                {
                  nodeType: 1,
                  tagName: "em",
                  attributes: {},
                  childNodes: [
                    {
                      nodeType: 3,
                      nodeName: "#text",
                      nodeValue: "website",
                      childNodes: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("literal mdx imported into another tiddler", async function () {
    // Note that to avoid wrapping the mdx literal in a <p>, there needs to be
    // a tag on the same line. For details, see: https://mdxjs.com/docs/what-is-mdx/#interleaving
    const { loader } = setup({
      tiddler2: `export const Fragment = mdx\`<span>[[tiddler1]]</span>\``,
      tiddler1: `
import {Fragment} from 'tiddler2'

Link: <Fragment />
`,
    });
    expect(
      (await getRendered(
        await loader.loadModule({ tiddler: "tiddler1" }),
        'tiddler1')).innerHTML
    ).toEqual('<p>Link: <span><a class="internal new" href="tiddler1">tiddler1</a></span></p>');
  });

  it("literal mdx including JS in curly braces", async function () {
    // Note that to avoid wrapping the mdx literal in a <p>, there needs to be
    // a tag on the same line. For details, see: https://mdxjs.com/docs/what-is-mdx/#interleaving
    const { loader } = setup({
      tiddler1: `
export const sum = mdx\`<span>{props.a + props.b}</span><span>testlabel</span>\`

3 + 4 = {sum({a: 3, b: 4})}
`,
    });
    expect(
      (await getRendered(
        await loader.loadModule({ tiddler: "tiddler1" }),
        'testlabel')).innerHTML
    ).toEqual(`<p>3 + 4 = <span>7</span>\n<span>testlabel</span></p>`);
  });

  it("literal mdx non-default exports accessed from containing tiddler", async function () {
    // Note that to avoid wrapping the mdx literal in a <p>, there needs to be
    // a tag on the same line. For details, see: https://mdxjs.com/docs/what-is-mdx/#interleaving
    const { loader } = setup({
      tiddler1: `
export const sum = mdx\`export const foo="bar"

sumready
\`

{sum()}
foo is {sum?.exports?.foo}

`,
    });
    const mod = await loader.loadModule({ tiddler: "tiddler1" });
    expect(
      (await getRendered(
        mod,
        'sumready')).innerHTML
    ).toEqual('<p>sumready</p>\n<p>foo is bar</p>');
  });


});
