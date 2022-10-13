
const _runEval = (code:string):any => window["eval"](code);

const getSourceMappingUrlComment = (code:string): string|undefined => {
  // check if the last line of code is a sourceMappingURL
  // the +1 is needed so the regexp scans only a single line
  const match = code.substring(code.lastIndexOf('\n')+1).match(new RegExp("^//# sourceMappingURL=([\\S]+)$"));
  return match?.[0];
}

const regularTW5CodeWrap = (code:string, contextNames: string[], sourceMapComment?:string) =>  `
(function(${contextNames.join(",")}) {
  (function(){
    ${code};
  })();
  return exports;
})
${sourceMapComment ?? ''}
`;

const wrapCode = (code:string, contextNames: string[], filename:string) => {
  const sourceMappingURLComment = getSourceMappingUrlComment(code);
  if (!sourceMappingURLComment) {
    return regularTW5CodeWrap(code, contextNames, `//# sourceURL=${filename}`);
  }
  // code is a webpack-compiled function with a sourceMappingURL trailing comment
  // line numbers might be off, but let's try naively appending the sourceMappingURL
  // comment to the end of the function
  return regularTW5CodeWrap(code, contextNames, `//# sourceURL=${filename}\n${sourceMappingURLComment}`);

}

export const patchedEvalGlobal = (code:string, context: Record<string, any>, filename:string, runEval:(code:string)=>any=_runEval):any => {
  const contextCopy = Object.assign(Object.create(null), context);
  // Get the context variables as a pair of arrays of names and values
  const contextNames:string[] = Object.keys(contextCopy);
  const contextValues:any[] = contextNames.map(k => contextCopy[k]);
  const wrappedCode = wrapCode(code, contextNames, filename);
  // Compile the code into a function
  const fn:any = runEval(wrappedCode);
  // Call the function and return the exports
  return fn.apply(null,contextValues);
};
