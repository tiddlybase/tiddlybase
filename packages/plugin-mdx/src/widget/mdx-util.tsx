import { JSError } from "@tiddlybase/plugin-react/src/components/JSError";
import { FC, ReactNode } from "react";
import type { MDXErrorDetails } from "../mdx-client/mdx-error-details";
import { MDXError } from "./components/MDXError";
import { CompilationResult } from "./mdx-module-loader";

export const reportCompileError = (
  error: MDXErrorDetails,
  mdx?: string,
  title?: string
) => MDXError({ title, mdx, details: error, fatal: true });

export const reportRuntimeError = (error: Error, title?: string, source?: string) =>
  JSError({ title, error, source });



// Wrap MDX compiler emitted component in try / catch
// and display any compilation warnings
export const wrapMDXComponent =
  (compilationResult: CompilationResult): FC<any> =>
  (props: any) => {
    const warnings =
      "warnings" in compilationResult ? compilationResult["warnings"] : [];
    let body: ReactNode = undefined;
    if (compilationResult) {
      if ("moduleExports" in compilationResult) {
        if (!("default" in compilationResult.moduleExports)) {
          body = reportRuntimeError(
            new Error("no default export found for module"),
            "MDX module missing default export"
          );
        } else {
          try {
            body = compilationResult.moduleExports.default(props);
          } catch (e) {
            body = reportRuntimeError(
              e as Error,
              "Error rendering default MDX component"
            );
          }
        }
      } else {
        // if !compilationResult
        body =
          compilationResult.error instanceof Error
            ? reportRuntimeError(
                compilationResult.error,
                compilationResult.errorTitle,
                compilationResult.source
              )
            : reportCompileError(
                compilationResult.error,
                compilationResult.mdx,
                compilationResult.errorTitle
              );
      }
    }
    return (
      <>
        {warnings.map((details) =>
          // TODO: need to set 'key' field
          MDXError({ mdx: compilationResult.mdx, details })
        )}
        {body}
      </>
    );
  };
