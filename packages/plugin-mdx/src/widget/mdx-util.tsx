import { JSError } from "@tiddlybase/plugin-react/src/components/JSError";
import { FC, ReactNode } from "react";
import type { MDXErrorDetails } from "../mdx-client/mdx-error-details";
import { MDXError } from "./components/MDXError";
import { CompilationResult } from "./mdx-module-loader";

export const reportCompileError = (error: MDXErrorDetails, mdx?: string, title?: string) => MDXError({ title, mdx, details: error, fatal: true });

export const reportRuntimeError = (error: Error, title?: string) => JSError({ title, error });

export const compiledMDXToReactComponent = (compilationResult:CompilationResult, additionalProps?:any):FC<any> => (props: any) => {
    try {
      const warnings = ("warnings" in compilationResult) ? compilationResult["warnings"] : [];
      let body: ReactNode = undefined;
      if (compilationResult) {
        if ("moduleExports" in compilationResult) {
          body = compilationResult?.moduleExports?.default({...(additionalProps ?? {}), ...props});
        } else {
          body = (compilationResult.error instanceof Error) ? reportRuntimeError(compilationResult.error, compilationResult.errorTitle) : reportCompileError(
            compilationResult.error,
            compilationResult.mdx,
            compilationResult.errorTitle
          );
        }
      }
      return <>
        {warnings.map((details) => MDXError({ mdx: compilationResult.mdx, details }))}
        {body}
      </>
    } catch (e) {
      return reportRuntimeError(e as Error, "Error rendering default MDX component");
    }
  };
