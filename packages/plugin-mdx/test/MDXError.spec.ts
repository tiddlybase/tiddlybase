import {extractPosition} from '../src/widget/components/MDXError'

describe('parsing error position', () => {
  it('should calculate offset correctly', async function () {
    expect(extractPosition('<a b>', "Expected a closing tag for `<a>` (1:1-1:6)")).toEqual({
      start: {
        line: 1,
        column: 1,
        offset: 0
      },
      end: {
        line: 1,
        column: 6,
        offset: 5
      }
    })
  })
})
