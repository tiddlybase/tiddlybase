import type { } from "@tiddlybase/tw5-types/src/index";
import { assertElementVisible, setup } from "./mdx-test-utils";


describe("MDX template module", () => {
  it("Specify a template module for displaying an MDX tiddler", async function () {
    // Since mdx literal component compilation is awaited in
    // MDXModuleLoader.getModuleExports(),
    const { loader } = setup({
      tiddler1: `export const Dynamic_content = mdx\`*hello*\`;

<Dynamic_content />
`,
    });
    const result = await loader.loadModule({
      tiddler: "tiddler1",
    });
    expect(Object.keys(result)).toContain("moduleExports");
    if ("moduleExports" in result) {
      // the compilation of the MDX literal is awaited during the compilation
      // of tiddler1, so "loading..." is never displayed.
      await assertElementVisible(result.moduleExports.default, "hello");

      const savedCompilationResult = await loader.getCompilationResult(
        "tiddler1"
      );
      expect(savedCompilationResult).not.toBeFalsy();

      expect(Object.keys(savedCompilationResult ?? {}).sort()).toEqual([
        "compiledFn",
        "dependencies",
        "mdx",
        "moduleExports",
        "tiddler",
        "warnings",
      ]);
      if (savedCompilationResult && "moduleExports" in savedCompilationResult) {
        expect(savedCompilationResult.moduleExports).toEqual(
          result.moduleExports
        );
        expect(
          savedCompilationResult.moduleExports.Dynamic_content
        ).not.toBeUndefined();
        expect(
          savedCompilationResult.moduleExports.Dynamic_content.exports.default
        ).not.toBeUndefined();
        expect(
          savedCompilationResult.moduleExports.Dynamic_content.compilationResult
        ).toEqual(
          expect.objectContaining({
            warnings: [],
            dependencies: new Set<string>([]),
            mdx: "*hello*",
          })
        );
      }
    }
  });
});
