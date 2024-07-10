import { MDXErrorProps, parseError } from '../src/widget/components/MDXError'

const ERR1: MDXErrorProps = {
  "title": "Error compiling MDX source",
  "mdx": "{",
  "details": {
    "column": 2,
    "message": "Unexpected end of file in expression, expected a corresponding closing brace for `{`",
    "line": 1,
    "name": "1:2",
    "place": {
      "line": 1,
      "column": 2,
      "offset": 1,
    },
    "reason": "Unexpected end of file in expression, expected a corresponding closing brace for `{`",
    "ruleId": "unexpected-eof",
    "source": "micromark-extension-mdx-expression",
    "url": "https://github.com/micromark/micromark-extension-mdx-expression/tree/main/packages/micromark-extension-mdx-expression#unexpected-end-of-file-in-expression-expected-a-corresponding-closing-brace-for-"
  },
  "fatal": true
}

const ERR2: MDXErrorProps = {
  "title": "Error compiling MDX source",
  "mdx": "<div>\n\t\n</d>\n\n",
  "details": {
    "column": 1,
    "message": "Unexpected closing tag `</d>`, expected corresponding closing tag for `<div>` (1:1-1:6)",
    "line": 3,
    "name": "3:1-3:5",
    "place": {
      "start": {
        "line": 3,
        "column": 1,
        "offset": 8,
      },
      "end": {
        "line": 3,
        "column": 5,
        "offset": 12,
      }
    },
    "reason": "Unexpected closing tag `</d>`, expected corresponding closing tag for `<div>` (1:1-1:6)",
    "ruleId": "end-tag-mismatch",
    "source": "mdast-util-mdx-jsx"
  },
  "fatal": true
}

const ERR3: MDXErrorProps = {
  "title": "Error compiling MDX source",
  "mdx": "{throw Exception('a')}\n\n",
  "details": {
    "cause": {
      "pos": 1,
      "loc": {
        "line": 1,
        "column": 1
      },
      "raisedAt": 5
    },
    "column": 2,
    "message": "Could not parse expression with acorn",
    "line": 1,
    "name": "1:2",
    "place": {
      "line": 1,
      "column": 2,
      "offset": 1
    },
    "reason": "Could not parse expression with acorn",
    "ruleId": "acorn",
    "source": "micromark-extension-mdx-expression",
    "url": "https://github.com/micromark/micromark-extension-mdx-expression/tree/main/packages/micromark-extension-mdx-expression#could-not-parse-expression-with-acorn"
  },
  "fatal": true
}

describe('parsing error position', () => {
  it('should correctly calculate range', async function () {
    expect(parseError(ERR1).range).toEqual({
      start: {
        line: 1,
        column: 2,
        offset: 1
      }
    })
  });
  expect(parseError(ERR2).range).toEqual({
    "start": {
      "line": 3,
      "column": 1,
      "offset": 8,
    },
    "end": {
      "line": 3,
      "column": 5,
      "offset": 12,
    }
  });
  expect(parseError(ERR3).range).toEqual({
    start:
    {
      "line": 1,
      "column": 2,
      "offset": 1
    }
  })

  it('should correctly identify erronous source fragment', async function () {
    expect(parseError(ERR1).cause).toEqual("");
    expect(parseError(ERR2).cause).toEqual("</d>");
    expect(parseError(ERR3).cause).toEqual("throw Exception('a')}");
  });

})
