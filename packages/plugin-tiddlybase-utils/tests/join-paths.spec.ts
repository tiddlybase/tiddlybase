import {joinPaths} from '../src/join-paths'

describe('joinPaths', function () {

  it('basic cases', async () => {
    expect(joinPaths()).toBe('');
    expect(joinPaths('a')).toBe('a');
    expect(joinPaths('a', 'b')).toBe('a/b');
    expect(joinPaths('a', 'b', 'c')).toBe('a/b/c');
  });

  it('trailing slashes preserved', async () => {
    expect(joinPaths('a/', 'b', 'c')).toBe('a/b/c');
    expect(joinPaths('a/', 'b', 'c/')).toBe('a/b/c/');
    expect(joinPaths('a/', 'b/', 'c/')).toBe('a/b/c/');
    expect(joinPaths('a/', 'b/', 'c')).toBe('a/b/c');
  });

  it('leading slash preserved', async () => {
    expect(joinPaths('/a/', 'b', 'c')).toBe('/a/b/c');
    expect(joinPaths('/a/', 'b', 'c/')).toBe('/a/b/c/');
    expect(joinPaths('/a/', 'b/', 'c/')).toBe('/a/b/c/');
    expect(joinPaths('/', 'b/', 'c/')).toBe('/b/c/');
    expect(joinPaths('/')).toBe('/');
    expect(joinPaths('/', '/')).toBe('/');
  });
});

