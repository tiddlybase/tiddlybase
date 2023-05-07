import type { } from "@tiddlybase/tw5-types/src/index";
import { getCreatedDate, getModifiedDate, setup } from "./tw5-mocks";
import { MDXTiddlybaseAPIImpl } from "../src/widget/mdx-tiddlybase-api-impl";
import type { MDXTiddlybaseAPI } from "../src/widget/mdx-tiddlybase-api";

const type = "text/x-markdown";

const getAPI = (...args: Parameters<typeof setup>): MDXTiddlybaseAPI => {
  const { wiki } = setup(...args);
  return new MDXTiddlybaseAPIImpl(wiki);
}

describe("MDX tiddlybase API", () => {
  it("getTiddler() can read existing tiddlers", async function () {
    const title = 'tiddler1';
    const text = 'foobar'
    const api = getAPI({
      [title]: text,
    });
    expect(api.getTiddler(title)).toEqual({
      title,
      text,
      type
    })
  })

  it("getTiddler() returns undefined for missing tiddlers", async function () {
    const title = 'tiddler1';
    const text = 'foobar'
    const api = getAPI({
      [title]: text,
    });
    expect(api.getTiddler("doesntexist")).toEqual(undefined)
  })

  it("setTiddler() implicitly sets default fields", async function () {
    const title = 'tiddler1';
    const text = 'foobar'
    const api = getAPI();
    api.setTiddler({
      title,
      text
    });
    expect(api.getTiddler(title)).toEqual({
      title,
      text,
      created: getCreatedDate(0),
      modified: getModifiedDate(0)
    });
    // only modified date changes, created does not
    const text2 = "foobar2"
    const result = api.setTiddler({
      title,
      text: text2
    });
    expect(result).toEqual({
      title,
      text: text2,
      created: getCreatedDate(0),
      modified: getModifiedDate(1)
    });
    expect(api.getTiddler(title)).toEqual(result);
  })

  it("setTiddler() erases fields missing from new version", async function () {
    const title = 'tiddler1';
    const text = 'foobar'
    const api = getAPI();
    api.setTiddler({
      title,
      text,
      field1: "foo"
    });
    expect(api.getTiddler(title)).toEqual({
      title,
      text,
      created: getCreatedDate(0),
      modified: getModifiedDate(0),
      field1: "foo"
    });
    const result = api.setTiddler({
      title,
      text,
      field2: "bar"
    });
    expect(result).toEqual({
      title,
      text,
      field2: "bar",
      created: getCreatedDate(0),
      modified: getModifiedDate(1)
    });
    expect(api.getTiddler(title)).toEqual(result);
  })

  it("updateTiddler() doesn't erase unaffected fields", async function () {
    const title = 'tiddler1';
    const api = getAPI();
    api.setTiddler({
      title,
      field1: 'foo',
      field2: 'bar'
    });
    expect(api.getTiddler(title)).toEqual({
      title,
      created: getCreatedDate(0),
      modified: getModifiedDate(0),
      field1: 'foo',
      field2: 'bar'
    });
    const result = api.updateTiddler({
      title,
      field2: "baz"
    });
    expect(result).toEqual({
      title,
      created: getCreatedDate(0),
      modified: getModifiedDate(1),
      field1: 'foo',
      field2: 'baz'
    });
    expect(api.getTiddler(title)).toEqual(result);
  })
});
