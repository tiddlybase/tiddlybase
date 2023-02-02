import type {} from "@tiddlybase/tw5-types/src/index";
import React from "react";
import { getRendered, setup, stripNewlines } from "./mdx-test-utils";

import { render, screen } from "@testing-library/react";
import { constructMDXContent } from "../src/widget/mdx-tag-function";
import { toJSON } from "@tiddlybase/plugin-browser-test-utils/src/tojson";
import {
  TW5ReactContextType,
} from "@tiddlybase/plugin-react/src/components/TW5ReactContext";

const assertElementVisible = async (Component: React.FC, text: string) => {
  render(<Component />);
  expect(await screen.findByText(text)).toBeVisible();
};

const makeMockContext = (
  tiddler: string,
  wiki: $tw.Wiki,
  variables?: Record<string, any>
): TW5ReactContextType => {
  const vars: Record<string, any> = { ...variables, currentTiddler: tiddler };
  const context = {
    parentWidget: {
      wiki,
      getVariable(varname) {
        return vars[varname];
      },
    },
  } as TW5ReactContextType;
  return context;
};


describe("tagged literal MDX construction", () => {
  it("handles case without bound values", async function () {
    expect(constructMDXContent(["hello"])).toEqual("hello");
  });
  it("handles case with a single bound values", async function () {
    expect(constructMDXContent(["foo{", "}bar"])).toEqual(
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
        "tiddler",
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
export const Dynamic_content = mdx\`*hello {\${num}} and {\${str}}*\`;

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
        "tiddler",
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
import {default as Website} from 'tiddler2'
export const Content = mdx\`welcome to my {\${<Website />}}\`;

<Content />
`,
    });
    const container = await getRendered(
      await loader.loadModule({ tiddler: "tiddler1" }),
      "website"
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

  it("context props correctly set when exports rendered by another tiddler", async function () {
    const { wiki, loader } = setup({
      literaltest: `
export const L0 = mdx\`# {props.l0}\`;
export const L1 = mdx\`
*currentTiddler*: {props.currentTiddler?.fields?.title}<br />
*definingTiddler*: {definingTiddlerTitle}<br />
*passedInProp*: {props.passedInProp}\`;
export const L2 = mdx\`
{\${L1}({passedInProp: props.passedInProp+"A"})}
{\${L0}(props)}
\`;

# default export
*currentTiddler*: {props.currentTiddler?.fields?.title}<br />
*definingTiddler*: {definingTiddlerTitle}<br />
*passedInProp*: {props.passedInProp+"B"}

# L1
<L1 passedInProp={props.passedInProp+"C"} />

# L2
<L2 passedInProp={props.passedInProp+"D"} l0={props.l0} />`,
      importliteraltest: `import {default as Content} from 'literaltest';

<Content {...props} />`,
    });
    const container1Ready = "literaltest-ready";
    const container1 = await getRendered(
      await loader.loadModule({ tiddler: "literaltest" }),
      container1Ready,
      makeMockContext("literaltest", wiki),
      { passedInProp: "foo", l0: container1Ready }
    );
    expect(stripNewlines(container1.innerHTML)).toEqual(
      stripNewlines(`
<h1>default export</h1>
<p>
<em>currentTiddler</em>: literaltest<br>
<em>definingTiddler</em>: literaltest<br>
<em>passedInProp</em>: fooB
</p>
<h1>L1</h1>
<p>
<em>currentTiddler</em>: literaltest<br>
<em>definingTiddler</em>: literaltest<br>
<em>passedInProp</em>: fooC
</p>
<h1>L2</h1>
<p>
<em>currentTiddler</em>: literaltest<br>
<em>definingTiddler</em>: literaltest<br>
<em>passedInProp</em>: fooDA
</p>
<h1>literaltest-ready</h1>`)
    );
    const container2Ready = "importliteraltest-ready";
    const container2 = await getRendered(
      await loader.loadModule({ tiddler: "importliteraltest" }),
      container2Ready,
      makeMockContext("importliteraltest", wiki),
      { passedInProp: "bar", l0: container2Ready }
    );
    expect(stripNewlines(container2.innerHTML)).toEqual(
      stripNewlines(`
<h1>default export</h1>
<p>
<em>currentTiddler</em>: importliteraltest<br>
<em>definingTiddler</em>: literaltest<br>
<em>passedInProp</em>: barB
</p>
<h1>L1</h1>
<p>
<em>currentTiddler</em>: importliteraltest<br>
<em>definingTiddler</em>: literaltest<br>
<em>passedInProp</em>: barC
</p>
<h1>L2</h1>
<p>
<em>currentTiddler</em>: importliteraltest<br>
<em>definingTiddler</em>: literaltest<br>
<em>passedInProp</em>: barDA
</p>
<h1>importliteraltest-ready</h1>
`)
    );
  });

  it("different ways to use mdx literal component", async function () {
    /*
    There are a number of ways to use components defined in literal mdx.
    They work roughly the same way from the default export as from
    MDX literals except for the additional escaping.
    - JSX syntax: `<L1 />` or `<L1 name="larry" />`. Familiar HTML-like syntax.
      In the mdx fragment case the JSX is evaluated *outside the fragment* and
      passed to the literal as a bound value so it won't have access to the
      props object of the literal mdx component, but it will have access to the
      names defined in the original module (which aren't accessible from within
      the literal's context). Also note that in the mdx literal case an extra
      set of `{}` is needed because the ${...} will be replace by
      props.literalBoundValues[N], eg: `{\${<L1 name="mary" />}}`
    - Invoking the `_jsx` constructor by hand. This is what the JSX syntax sugar
      compiles to. It's not as pretty as the tag-like syntax, but a big advantage
      is that props can be passed from the mdx literal:
      {_jsx(\${L1}, props)}
      In the expression above the component L1 is passed to the mdx literal as
      a bound value, but the 'props' symbol refers to the props variable passed
      to the mdx literal's default component. Using this syntax it's also possible
      to pass props from *outside* the MDX literal, eg:
      {_jsx(\${L1}, {prop1: props.prop1, prop2: \${externalProp}})}
    - Direct invocation: React functional components are just functions. This
      won't work for class-based components, but since the MDX compiler emits
      functional components, it's safe to invoke them directly as:
      `{L1({name: "jacob"})}` in the body of the MDX doc or as
      `{\${L1}({name: props.name})}` within an MDX literal.
     */
    const { wiki, loader } = setup({
      literaltest: `
export const L0 = mdx\`# test-ready\`;
export const L1 = mdx\`# hello {props.name}\`;
export const L2 = mdx\`
{\${L1}({name: props.name})}
{\${<L1 name="mary" />}}
{_jsx(\${L1}, {name: props.name+"son"})}
{\${L0}()}
\`;

{L1({name: "jacob"})}
<L1 name="abraham" />
{_jsx(L1, {name: "samantha"})}
<L2 name="peter" />
`,
    });

    const container1Ready = "test-ready";
    const container1 = await getRendered(
      await loader.loadModule({ tiddler: "literaltest" }),
      container1Ready,
      makeMockContext("literaltest", wiki)
    );
    expect(stripNewlines(container1.innerHTML)).toEqual(stripNewlines(`
<h1>hello jacob</h1>
<h1>hello abraham</h1>
<h1>hello samantha</h1>
<h1>hello peter</h1>
<h1>hello mary</h1>
<h1>hello peterson</h1>
<h1>test-ready</h1>`));
    /* To see the compiled JS, uncomment:
    const compilationResult = await loader.getCompilationResult("literaltest") as any;
    console.log(compilationResult.compiledFn.toString());
    console.log(compilationResult.moduleExports.L0.compilationResult.compiledFn.toString());
    console.log(compilationResult.moduleExports.L1.compilationResult.compiledFn.toString());
    console.log(compilationResult.moduleExports.L2.compilationResult.compiledFn.toString());
    */
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
      (
        await getRendered(
          await loader.loadModule({ tiddler: "tiddler1" }),
          "tiddler1"
        )
      ).innerHTML
    ).toEqual(
      '<p>Link: <span><a class="internal new" href="tiddler1">tiddler1</a></span></p>'
    );
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
      (
        await getRendered(
          await loader.loadModule({ tiddler: "tiddler1" }),
          "testlabel"
        )
      ).innerHTML
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
    expect((await getRendered(mod, "sumready")).innerHTML).toEqual(
      "<p>sumready</p>\n<p>foo is bar</p>"
    );
  });
});
