import { PARSER_TITLE_PLACEHOLDER } from "./mdx";

class MDXParser implements $tw.Parser {

  tree: $tw.ParseTree[]

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
            "title": {
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
