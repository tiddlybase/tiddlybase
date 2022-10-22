const _makeFunction = (code:string, contextNames: string[]):any => new Function(...[...contextNames, code]);

const getSourceMappingUrlComment = (code:string): string|undefined => {
  // check if the last line of code is a sourceMappingURL
  // the +1 is needed so the regexp scans only a single line
  const match = code.substring(code.lastIndexOf('\n')+1).match(new RegExp("^//# sourceMappingURL=([\\S]+)$"));
  return match?.[0];
}

const regularTW5CodeWrap = (code:string, sourceMapComment?:string) =>  `${code}\n${sourceMapComment ?? ''}`;

const wrapCode = (code:string, filename:string) => {
  const sourceMappingURLComment = getSourceMappingUrlComment(code);
  if (!sourceMappingURLComment) {
    return regularTW5CodeWrap(code, `//# sourceURL=${filename}`);
  }
  // code is a webpack-compiled function with a sourceMappingURL trailing comment
  // line numbers might be off, but let's try naively appending the sourceMappingURL
  // comment to the end of the function
  return regularTW5CodeWrap(code, `//# sourceURL=${filename}\n${sourceMappingURLComment}`);

}

export const patchedEvalGlobal = (code:string, context: Record<string, any>, filename:string, makeFunction=_makeFunction) => {
  const contextCopy = Object.assign(Object.create(null), context);
  // Get the context variables as a pair of arrays of names and values
  const contextNames:string[] = Object.keys(contextCopy);
  const contextValues:any[] = contextNames.map(k => contextCopy[k]);
  const wrappedCode = wrapCode(code, filename);
  // Compile the code into a function
  const fn:any = makeFunction(wrappedCode, contextNames);
  // Call the function and return the exports
  // TODO: maybe catch exceptions?
  fn.apply(null,contextValues);
  return context['exports'];
};
