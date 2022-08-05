const PATH_SEPARATOR = "/";

export const joinPaths = (...pathPart: string[]) => pathPart.reduce((acc, part) => {
  const left = (acc.endsWith(PATH_SEPARATOR)) ? acc.slice(0, -1) : acc;
  const right = (part.startsWith(PATH_SEPARATOR)) ? part.substring(1) : part;
  return `${left}${PATH_SEPARATOR}${right}`;
}, "");
