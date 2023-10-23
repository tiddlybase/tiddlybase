import { PathTemplate, PathTemplateComponent, PathTemplateComponentEncoding } from "@tiddlybase/shared/src/path-template";

// Regxp for at least on character, no spaces or slashes:
const IDENTIFIER_REGEXP = "[^\\s\\/\\\\]+";

const DEFAULT_ENCODING:PathTemplateComponentEncoding = 'encodeURIComponent';

export type PathVariables = Record<string, string>;

export const encodePathComponent = (value:string, encoding:PathTemplateComponentEncoding):string => {
  switch (encoding) {
    case "encodeURI":
      return encodeURI(value);
    case "base64":
      return encodeURIComponent(btoa(value))
    case "encodeURIComponent":
      return encodeURIComponent(value);
  }
}

export const decodePathComponent = (encodedValue:string, encoding:PathTemplateComponentEncoding):string => {
  switch (encoding) {
    case "encodeURI":
      return decodeURI(encodedValue);
    case "base64":
      return atob(decodeURIComponent(encodedValue));
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
  return Object.entries(match?.groups ?? {}).reduce(
    (acc: PathVariables, [variableName, value]) => {
      if (!!value) {
        const component = componentsByVariable[variableName]
        acc[variableName] = decodePathComponent(value, component.encoding ?? DEFAULT_ENCODING);
      }
      return acc;
    },
    {} as PathVariables);
}

export const createURLPath = (pathTemplate:PathTemplate, variables:PathVariables):string => {
  return pathTemplate.reduce((pathAcc:string, pathComponent:PathTemplateComponent) => {
    const value = variables[pathComponent.variableName];
    if (value) {
      return pathAcc + `/${pathComponent.shortName}/${encodePathComponent(value, pathComponent.encoding ?? DEFAULT_ENCODING)}`
    }
    return pathAcc;
  }, "")
}