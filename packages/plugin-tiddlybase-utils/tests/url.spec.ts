/// <reference types="@tiddlybase/tw5-types/src/index" />
import * as url from '../src/url'

describe('helper tests', function () {

  it('get extension', async () => {
    expect(url.getExtension('a.gif')).toBe('gif');
    expect(url.getExtension('')).toBe(undefined);
    expect(url.getExtension('http://a.com/path')).toBe(undefined);
    expect(url.getExtension('http://a.com/a.gif')).toBe('gif');
    expect(url.getExtension('http://a.com/a.gif?param=value')).toBe('gif');
    expect(url.getExtension('a.bunch.of.dots.gif')).toBe('gif');
  });
});

