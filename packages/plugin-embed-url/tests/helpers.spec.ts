import type { TW } from 'packages/tw5-types/src';
import {generateHtml} from '../src/helper'
// The '.js' at the end is very very strange I know
// based on: https://github.com/ert78gb/jasmine4-typescript-es6-module-example

describe('helper tests', function () {

  it('generateHtml', async () => {
    globalThis.$tw = {} as TW;
    const rendered = generateHtml({
      src: "a.gif",
      resolvedSrc: "a.gif",
      inSandboxedIframe: false,
      cssClasses: [],
      parsedAttributes: []
    })
    expect(rendered.innerHTML).toMatch(new RegExp("<img src=\"a.gif\"\\s*/>"));
  });
});

