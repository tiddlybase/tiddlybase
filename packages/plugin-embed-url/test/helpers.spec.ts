import * as helper from '../src/helper.js'
// The '.js' at the end is very very strange I know
// based on: https://github.com/ert78gb/jasmine4-typescript-es6-module-example

describe('helper tests', function () {

  it('get extension', async () => {
    expect(helper.getExtension('a.gif')).toBe('gif');
    expect(helper.getExtension('/a/longer/filename/MYNAME.JPEG')).toBe('jpeg');
  });
});

