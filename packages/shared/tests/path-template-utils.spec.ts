import { DEFAULT_URL_CONFIG } from "../src/constants";
import { createURL, encodePathComponent, parseURL } from "../src/path-template-utils";


describe("parseURLPath", function () {
  it("can extract instance name from path", async () => {
    expect(
      parseURL(
        "https://tiddlybase.com/",
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({});
    expect(
      parseURL(
        "https://tiddlybase.com/i/",
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({prefix: "/i"});
    expect(
      parseURL(
        "https://tiddlybase.com/i/myinstance",
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({ instance: "myinstance" });
    expect(
      parseURL(
        "https://tiddlybase.com/i/myinstance/",
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({ instance: "myinstance" });
    expect(
      parseURL(
        "https://tiddlybase.com/i/my%20instance",
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({ instance: "my instance" });
    expect(
      parseURL(
        "https://tiddlybase.com/junkprefix/stilljunk/alsojunk/i/my%20instance",
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({
      instance: "my instance",
      prefix: "/junkprefix/stilljunk/alsojunk"
    });
  });

  it("can extract launchConfig name from path", async () => {
    expect(
      parseURL(
        "https://tiddlybase.com/lc/mylaunchconfig",
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({ launchConfig: "mylaunchconfig" });
    expect(
      parseURL(
        "https://tiddlybase.com/lc/my%20launch%20config",
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({ launchConfig: "my launch config" });
    expect(
      parseURL(
        "https://tiddlybase.com/lc/my%20launch%20config/i/myinstance",
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({
      launchConfig: "my launch config",
      instance: "myinstance",
    });
    expect(
      parseURL(
        "https://tiddlybase.com/i/myinstance/lc/my%20launch%20config/",
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({
      launchConfig: "my launch config",
      // launchconfig must come first
      prefix: "/i/myinstance"
    });
  });

  it("can extract tiddler name from path", async () => {
    expect(
      parseURL(
        "https://tiddlybase.com/t/my%20tiddler%20name",
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({ tiddler: "my tiddler name" });
    expect(
      parseURL(
        "https://tiddlybase.com/junkprefix/stilljunk/alsojunk/t/my/tiddler/with/slashs%20and%20spaces",
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({
      tiddler: "my/tiddler/with/slashs and spaces",
      prefix: "/junkprefix/stilljunk/alsojunk"
    });
  });

  it("can extract filters", async () => {
    const filter = "[is[tiddler]type[application/javascript]]";
    const encodedFilter = encodePathComponent(filter, "base64");
    expect(
      parseURL(
        `https://tiddlybase.com/f/${encodedFilter}`,
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({ filter });
  });
});

describe("createURL", function () {

  it("can encode tiddler name", async () => {
    expect(
      createURL(
        'https://tiddlybase.com',
        DEFAULT_URL_CONFIG.pathTemplate,
        {tiddler: 'my favorite tiddler'}
      )
    ).toEqual("https://tiddlybase.com/t/my%20favorite%20tiddler");
  });

  it("can encode tiddler name with slashes", async () => {
    expect(
      createURL(
        'https://tiddlybase.com',
        DEFAULT_URL_CONFIG.pathTemplate,
        {tiddler: 'my/favorite/tiddler'}
      )
    ).toEqual("https://tiddlybase.com/t/my/favorite/tiddler");
  });

  it("preserves search params and hash", async () => {
    expect(
      createURL(
        'https://tiddlybase.com/?foo=bar#heading1',
        DEFAULT_URL_CONFIG.pathTemplate,
        {tiddler: 'my/favorite/tiddler'}
      )
    ).toEqual("https://tiddlybase.com/t/my/favorite/tiddler?foo=bar#heading1");
  });

  it("preserves path prefix", async () => {
    expect(
      // Note that prefix should only be preserved if it's not a recognized path parameter!
      createURL(
        'https://tiddlybase.com/some/super/prefix',
        DEFAULT_URL_CONFIG.pathTemplate,
        {tiddler: 'my/favorite/tiddler'}
      )
    ).toEqual("https://tiddlybase.com/some/super/prefix/t/my/favorite/tiddler");

    expect(
      // Recognized postfix of path will be overridden by path variables
      createURL(
        'https://tiddlybase.com/some/super/prefix/t/tid1',
        DEFAULT_URL_CONFIG.pathTemplate,
        {tiddler: 'tid2'}
      )
    ).toEqual("https://tiddlybase.com/some/super/prefix/t/tid2");

    expect(
      // ...unless different pathvariables were passed in
      createURL(
        'https://tiddlybase.com/some/super/prefix/lc/lc1',
        DEFAULT_URL_CONFIG.pathTemplate,
        {tiddler: 'tid2'}
      )
    ).toEqual("https://tiddlybase.com/some/super/prefix/lc/lc1/t/tid2");

    expect(
      // passing in an empty string erases the original path var
      createURL(
        'https://tiddlybase.com/some/super/prefix/lc/lc1',
        DEFAULT_URL_CONFIG.pathTemplate,
        {
          tiddler: 'tid2',
          launchConfig: ''
        }
      )
    ).toEqual("https://tiddlybase.com/some/super/prefix/t/tid2");
  });


});
