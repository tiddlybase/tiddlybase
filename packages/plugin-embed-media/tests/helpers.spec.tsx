import React from "react";
import { generateHtml } from "../src/helper";
import { EmbedAttribute } from "../src/props";
// The '.js' at the end is very very strange I know
// based on: https://github.com/ert78gb/jasmine4-typescript-es6-module-example

describe("helper tests", function () {
  it("generateHtml", async () => {
    const rendered = generateHtml({
      src: "a.gif",
      resolvedSrc: "a.gif",
      inSandboxedIframe: false,
      cssClasses: [],
      parsedAttributes: new Set<EmbedAttribute>(),
    });
    expect(rendered).toEqual({
      cssClasses: [],
      element: (<img className="" src="a.gif" />) as React.ReactElement,
      inSandboxedIframe: false,
      parsedAttributes: new Set([]),
      resolvedSrc: "a.gif",
      src: "a.gif",
    });
  });
});
