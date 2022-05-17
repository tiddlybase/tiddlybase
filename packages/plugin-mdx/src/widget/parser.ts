import type { Parser, ParseTree, Wiki } from "packages/tw5-types/src";

class MDXParser implements Parser {

  tree: ParseTree[]

  constructor(type: string|null|undefined, text:string, options?:{wiki:Wiki}) {

      this.tree = [
        {
          "type": "ReactWrapper",
          "attributes": {
            "module": {
              "name": "module",
              "type": "string",
              "value": "$:/plugins/tiddlybase/mdx/mdx.js"
            },
            "export": {
                "name": "export",
                "type": "string",
                "value": "MDX"
            },
            "mdx": {
                "name": "mdx",
                "type": "string",
                "value": text
            },
            "name": {
                "name": "name",
                "type": "string",
                "value": "parserGeneratedMDX"
            }
          }
        }
      ];
  }
}

export {MDXParser}
