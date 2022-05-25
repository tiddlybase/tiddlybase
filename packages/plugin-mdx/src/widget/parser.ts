import type { Parser, ParseTree } from "packages/tw5-types/src";
import { PARSER_TITLE_PLACEHOLDER } from "./mdx";

class MDXParser implements Parser {

  tree: ParseTree[]

  constructor(type: string|null|undefined, text:string) {

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
                "value": "MDXFactory"
            },
            "mdx": {
                "name": "mdx",
                "type": "string",
                "value": text
            },
            "name": {
                "name": "title",
                "type": "string",
                "value": PARSER_TITLE_PLACEHOLDER
            }
          }
        }
      ];
  }
}

exports['text/x-markdown'] = MDXParser;
