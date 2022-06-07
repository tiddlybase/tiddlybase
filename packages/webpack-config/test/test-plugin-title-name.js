const {isPackageImport, isAbsolutePath, isTiddlybaseImport, getPackageNameFromAbsolutePath, getFilenameForImport, getOutputForSourceFile, PROJECT_ROOT} = require('../src/plugin-utils');
const path = require('path');

describe("plugin title tiddlers", function() {
  it("isAbsolutePath", async function() {
    expect(isAbsolutePath('')).toEqual(false);
    expect(isAbsolutePath('./a')).toEqual(false);
    expect(isAbsolutePath('@tiddlybase/a')).toEqual(false);
    expect(isAbsolutePath('/a')).toEqual(true);
  });

  it("isTiddlybaseImport", async function() {
    expect(isTiddlybaseImport('')).toEqual(false);
    expect(isTiddlybaseImport('./a')).toEqual(false);
    expect(isTiddlybaseImport('@tiddlybase/a')).toEqual(true);
    expect(isTiddlybaseImport('/a')).toEqual(false);
  });

  it("getPackageNameFromAbsolutePath", async function() {
    expect(getPackageNameFromAbsolutePath(`${PROJECT_ROOT}/packages/plugin-react/src/components/TW5ReactContext.tsx`)).toEqual("plugin-react");
    expect(getPackageNameFromAbsolutePath(`${PROJECT_ROOT}/packages/foobar/src/components/TW5ReactContext.tsx`)).toEqual('foobar');
  });


 it("getOutputForSourceFile", async function() {
    expect(getOutputForSourceFile('/Users/neumark/git/tiddlybase/packages/plugin-react/src/components/TW5ReactContext.tsx')).toEqual(
    {
      outputDir: '/Users/neumark/git/tiddlybase/dist/plugins/tiddlybase/react',
      outputSubdir: 'components',
      outputFilename: 'TW5ReactContext.js',
      outputTiddler: '$:/plugins/tiddlybase/react/components/TW5ReactContext.js'
    });
  });

  it("getFilenameForImport", async function() {
    expect(getFilenameForImport('w.js', '/Users/asdf')).toEqual('/Users/asdf');
    expect(getFilenameForImport('/asdf/w.js', './foo')).toEqual('/asdf/foo');
    expect(getFilenameForImport('/asdf/w.js', '@tiddlybase/plugin-react/src/tiddler-removal-detector')).toEqual(PROJECT_ROOT +'/packages/plugin-react/src/tiddler-removal-detector');
    expect(getFilenameForImport('/asdf/w.js', 'tslib')).toEqual(undefined);

  });

  it("getPackageNameFromAbsolutePath", async function() {
    expect(getPackageNameFromAbsolutePath(path.join(PROJECT_ROOT, 'packages/foobar/src/a.js'))).toEqual('foobar');

  });



});
