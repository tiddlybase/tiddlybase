import { DEFAULT_URL_CONFIG } from "@tiddlybase/shared/src/constants";
import { parseURLPath } from "../src/path-template-utils";

const getURLPath = (urlStr: string): string => {
  const url = new URL(urlStr);
  return url.pathname;
};

describe("parseURLPath", function () {
  it("can extract instance name from path", async () => {
    expect(
      parseURLPath(
        getURLPath("https://tiddlybase.com/"),
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({});
    expect(
      parseURLPath(
        getURLPath("https://tiddlybase.com/i/"),
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({});
    expect(
      parseURLPath(
        getURLPath("https://tiddlybase.com/i/myinstance"),
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({ instance: "myinstance" });
    expect(
      parseURLPath(
        getURLPath("https://tiddlybase.com/i/myinstance/"),
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({ instance: "myinstance" });
    expect(
      parseURLPath(
        getURLPath("https://tiddlybase.com/i/my%20instance"),
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({ instance: "my instance" });
    expect(
      parseURLPath(
        getURLPath("https://tiddlybase.com/junkprefix/stilljunk/alsojunk/i/my%20instance"),
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({ instance: "my instance" });
  });

  it("can extract launchConfig name from path", async () => {
    expect(
      parseURLPath(
        getURLPath("https://tiddlybase.com/lc/mylaunchconfig"),
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({ launchConfig: "mylaunchconfig" });
    expect(
      parseURLPath(
        getURLPath("https://tiddlybase.com/lc/my%20launch%20config"),
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({ launchConfig: "my launch config" });
    expect(
      parseURLPath(
        getURLPath("https://tiddlybase.com/lc/my%20launch%20config/i/myinstance"),
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({
      launchConfig: "my launch config",
      instance: "myinstance"
    });
    // launchconfig must come first
    expect(
      parseURLPath(
        getURLPath("https://tiddlybase.com/i/myinstance/lc/my%20launch%20config/"),
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({
      launchConfig: "my launch config",
    });
  });

  it("can extract tiddler name from path", async () => {
    expect(
      parseURLPath(
        getURLPath("https://tiddlybase.com/t/my%20tiddler%20name"),
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({ tiddler: "my tiddler name" });
    expect(
      parseURLPath(
        getURLPath("https://tiddlybase.com/junkprefix/stilljunk/alsojunk/t/my/tiddler/with/slashs%20and%20spaces"),
        DEFAULT_URL_CONFIG.pathTemplate
      )
    ).toEqual({ tiddler: "my/tiddler/with/slashs and spaces" });
  });

});
