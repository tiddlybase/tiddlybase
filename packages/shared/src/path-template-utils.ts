import { PathTemplate, PathTemplateComponent, PathTemplateComponentEncoding } from "./path-template";

// Regxp for at least on character, no spaces or slashes:
const IDENTIFIER_REGEXP = "[^\\s\\/\\\\]+";

const DEFAULT_ENCODING:PathTemplateComponentEncoding = 'encodeURIComponent';

export type PathVariables = Record<string, string>;

export const encodePathComponent = (value:string, encoding:PathTemplateComponentEncoding):string => {
  switch (encoding) {
    case "encodeURI":
      return encodeURI(value);
    case "base64":
      return btoa(encodeURIComponent(value))
    case "encodeURIComponent":
      return encodeURIComponent(value);
  }
}

export const decodePathComponent = (encodedValue:string, encoding:PathTemplateComponentEncoding):string => {
  switch (encoding) {
    case "encodeURI":
      return decodeURI(encodedValue);
    case "base64":
      return decodeURIComponent(atob(encodedValue));
    case "encodeURIComponent":
      return decodeURIComponent(encodedValue);
  }
}

const pathRegexpPart = ({shortName, variableName, pattern}:PathTemplateComponent):string => `(?:\\/${shortName}\\/(?<${variableName}>${pattern ?? IDENTIFIER_REGEXP}))?`;

export const createPathRegExp = (pathTemplate:PathTemplate):RegExp => {
  const re = `${pathTemplate.map(pathRegexpPart).join('')}/?$`;
  return new RegExp(re);
}

export const parseURLPath = (path:string, pathTemplate: PathTemplate):PathVariables => {
  const pathRegExp:RegExp = createPathRegExp(pathTemplate);
  const componentsByVariable = pathTemplate.reduce((acc, component) => {
    acc[component.variableName] = component;
    return acc;
  }, {} as Record<string, PathTemplateComponent>);
  const match = path.match(pathRegExp);
  const pathVariables:PathVariables = {};
  if ((match?.index  ?? 0) > 0) {
    const prefix = path.substring(0, match!.index);
    pathVariables['prefix'] = prefix;
  }
  return Object.entries(match?.groups ?? {}).reduce(
    (acc: PathVariables, [variableName, value]) => {
      if (!!value) {
        const component = componentsByVariable[variableName]
        acc[variableName] = decodePathComponent(value, component.encoding ?? DEFAULT_ENCODING);
      }
      return acc;
    },
    pathVariables);
}

export const parseURL = (url:string, pathTemplate:PathTemplate):PathVariables => {
  const parsedUrl = new URL(url);
  return parseURLPath(parsedUrl.pathname, pathTemplate);
}

export const createURLPath = (pathTemplate:PathTemplate, pathVariables:PathVariables):string => {
  return pathTemplate.reduce((pathAcc:string, pathComponent:PathTemplateComponent) => {
    const value = pathVariables[pathComponent.variableName];
    if (value) {
      return pathAcc + `/${pathComponent.shortName}/${encodePathComponent(value, pathComponent.encoding ?? DEFAULT_ENCODING)}`
    }
    return pathAcc;
  }, "")
}

export const createURL = (baseURL:string, pathTemplate:PathTemplate, pathVariables:PathVariables):string => {
  const parsedBaseURL = new URL(baseURL);
  const baseURLPathVariables = parseURL(baseURL, pathTemplate);
  const mergedPathVariables = Object.assign({}, baseURLPathVariables, pathVariables);
  parsedBaseURL.pathname = (baseURLPathVariables["prefix"] ?? "") + createURLPath(pathTemplate, mergedPathVariables);
  return parsedBaseURL.href;
}