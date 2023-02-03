import { JSError } from "@tiddlybase/plugin-react/src/components/JSError";
import { FC } from "react";
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
export const wrapMDXComponent = (compilationResult: CompilationResult): FC<any> => {
    const warnings =
        "warnings" in compilationResult ? compilationResult["warnings"] : [];
    let Component: FC<any>;
    if (compilationResult) {
      if ("moduleExports" in compilationResult) {
        if (!("default" in compilationResult.moduleExports)) {
          Component = () => reportRuntimeError(
            new Error("no default export found for module"),
            "MDX module missing default export"
          );
        } else {
          Component = (props:any) => {
            try {
              return compilationResult.moduleExports.default(props);
            } catch (e) {
              return reportRuntimeError(
                e as Error,
                "Error rendering default MDX component"
              );
            }
          }
        }
      } else {
        // if !compilationResult
        if (compilationResult.error instanceof Error) {
          Component = () => reportRuntimeError(
            compilationResult.error,
            compilationResult.errorTitle,
            compilationResult.source
          )
        } else {
          Component = () => reportCompileError(
            compilationResult.error as MDXErrorDetails,
            compilationResult.mdx,
            compilationResult.errorTitle
          );
        }
      }
    }
    return (props: any) => (
        <>
          {warnings.map((details, ix) => (
          <div key={ix}>
              < MDXError mdx={compilationResult.mdx} details={details} />
            </div>
          ))}
          <Component {...props} />
        </>
      );
  }

