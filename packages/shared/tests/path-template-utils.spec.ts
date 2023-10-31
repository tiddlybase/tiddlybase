import { DEFAULT_URL_CONFIG } from "../src/constants";
import { createURL, encodePathComponent, parseURL } from "../src/path-template-utils";

const getPrefixAndVariables = (href: string) => {
  const parsed = parseURL(
    href,
    DEFAULT_URL_CONFIG.pathTemplate
  );
  return [parsed.pathPrefix, parsed.pathVariables];
}

describe("parseURLPath", function () {
  it("can extract instance name from path", async () => {
    expect(
      getPrefixAndVariables(
        "https://tiddlybase.com/",
      )
    ).toEqual(['', {}]);
    expect(
      getPrefixAndVariables(
        "https://tiddlybase.com/i/",
      )
    ).toEqual(["/i", {}]);
    expect(
      getPrefixAndVariables(
        "https://tiddlybase.com/i/myinstance",
      )
    ).toEqual(["", { instance: "myinstance" }]);
    expect(
      getPrefixAndVariables(
        "https://tiddlybase.com/i/myinstance/",
      )
    ).toEqual(["", { instance: "myinstance" }]);
    expect(
      getPrefixAndVariables(
        "https://tiddlybase.com/i/my%20instance",
      )
    ).toEqual(["", { instance: "my instance" }]);
    expect(
      getPrefixAndVariables(
        "https://tiddlybase.com/junkprefix/stilljunk/alsojunk/i/my%20instance",
      )
    ).toEqual(["/junkprefix/stilljunk/alsojunk", {
      instance: "my instance",
    }]);
  });

  it("can extract launchConfig name from path", async () => {
    expect(
      getPrefixAndVariables(
        "https://tiddlybase.com/lc/mylaunchconfig",
      )
    ).toEqual(['', { launchConfig: "mylaunchconfig" }]);
    expect(
      getPrefixAndVariables(
        "https://tiddlybase.com/lc/my%20launch%20config",
      )
    ).toEqual(['', { launchConfig: "my launch config" }]);
    expect(
      getPrefixAndVariables(
        "https://tiddlybase.com/lc/my%20launch%20config/i/myinstance",
      )
    ).toEqual(['', {
      launchConfig: "my launch config",
      instance: "myinstance",
    }]);
    expect(
      getPrefixAndVariables(
        "https://tiddlybase.com/i/myinstance/lc/my%20launch%20config/",
      )
    ).toEqual(["/i/myinstance", {
      launchConfig: "my launch config",
      // launchconfig must come first
    }]);
  });

  it("can extract tiddler name from path", async () => {
    expect(
      getPrefixAndVariables(
        "https://tiddlybase.com/t/my%20tiddler%20name",
      )
    ).toEqual(['', { tiddler: "my tiddler name" }]);
    expect(
      getPrefixAndVariables(
        "https://tiddlybase.com/junkprefix/stilljunk/alsojunk/t/my/tiddler/with/slashs%20and%20spaces",
      )
    ).toEqual(["/junkprefix/stilljunk/alsojunk", {
      tiddler: "my/tiddler/with/slashs and spaces",
    }]);
  });

  it("can extract filters", async () => {
    const filter = "[is[tiddler]type[application/javascript]]";
    const encodedFilter = encodePathComponent(filter, "base64");
    expect(
      getPrefixAndVariables(
        `https://tiddlybase.com/f/${encodedFilter}`,
      )
    ).toEqual(['', { filter }]);
  });
});

describe("createURL", function () {

  it("can encode tiddler name", async () => {
    expect(
      createURL(
        'https://tiddlybase.com',
        DEFAULT_URL_CONFIG.pathTemplate,
        { tiddler: 'my favorite tiddler' }
      )
    ).toEqual("https://tiddlybase.com/t/my%20favorite%20tiddler");
  });

  it("can encode tiddler name with slashes", async () => {
    expect(
      createURL(
        'https://tiddlybase.com',
        DEFAULT_URL_CONFIG.pathTemplate,
        { tiddler: 'my/favorite/tiddler' }
      )
    ).toEqual("https://tiddlybase.com/t/my/favorite/tiddler");
  });

  it("preserves search params and hash", async () => {
    expect(
      createURL(
        'https://tiddlybase.com/?foo=bar#heading1',
        DEFAULT_URL_CONFIG.pathTemplate,
        { tiddler: 'my/favorite/tiddler' }
      )
    ).toEqual("https://tiddlybase.com/t/my/favorite/tiddler?foo=bar#heading1");
  });

  it("preserves path prefix", async () => {
    expect(
      // Note that prefix should only be preserved if it's not a recognized path parameter!
      createURL(
        'https://tiddlybase.com/some/super/prefix',
        DEFAULT_URL_CONFIG.pathTemplate,
        { tiddler: 'my/favorite/tiddler' }
      )
    ).toEqual("https://tiddlybase.com/some/super/prefix/t/my/favorite/tiddler");

    expect(
      // Recognized postfix of path will be overridden by path variables
      createURL(
        'https://tiddlybase.com/some/super/prefix/t/tid1',
        DEFAULT_URL_CONFIG.pathTemplate,
        { tiddler: 'tid2' }
      )
    ).toEqual("https://tiddlybase.com/some/super/prefix/t/tid2");

    expect(
      // ...unless different pathvariables were passed in
      createURL(
        'https://tiddlybase.com/some/super/prefix/lc/lc1',
        DEFAULT_URL_CONFIG.pathTemplate,
        { tiddler: 'tid2' }
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
