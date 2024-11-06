import { PathTemplate, PathTemplateComponent, PathTemplateComponentEncoding, PathTemplateVariable } from "./path-template";
import { SearchVariables } from "./tiddlybase-config-schema";
import {fragmentNameToURLHash, urlHashToFragmentName} from "./fragment-utils"

// Regxp for at least on character, no spaces or slashes:
const IDENTIFIER_REGEXP = "[^\\s\\/\\\\]+";

const DEFAULT_ENCODING: PathTemplateComponentEncoding = 'encodeURIComponent';

export type PathVariables = Partial<Record<PathTemplateVariable, string>>;

export const encodePathComponent = (value: string, encoding: PathTemplateComponentEncoding): string => {
  switch (encoding) {
    case "encodeURI":
      return encodeURI(value);
    case "base64":
      return btoa(encodeURIComponent(value))
    case "encodeURIComponent":
      return encodeURIComponent(value);
  }
}

export const decodePathComponent = (encodedValue: string, encoding: PathTemplateComponentEncoding): string => {
  switch (encoding) {
    case "encodeURI":
      return decodeURI(encodedValue);
    case "base64":
      return decodeURIComponent(atob(encodedValue));
    case "encodeURIComponent":
      return decodeURIComponent(encodedValue);
  }
}

const pathRegexpPart = ({ shortName, variableName, pattern }: PathTemplateComponent): string => `(?:\\/${shortName}\\/(?<${variableName}>${pattern ?? IDENTIFIER_REGEXP}))?`;

export const createPathRegExp = (pathTemplate: PathTemplate): RegExp => {
  const re = `${pathTemplate.map(pathRegexpPart).join('')}/?$`;
  return new RegExp(re);
}

export const parseURLPath = (pathTemplate: PathTemplate, path: string): [string, PathVariables] => {
  let prefix = "";
  const pathRegExp: RegExp = createPathRegExp(pathTemplate);
  const componentsByVariable = pathTemplate.reduce((acc, component) => {
    acc[component.variableName] = component;
    return acc;
  }, {} as Record<PathTemplateVariable, PathTemplateComponent>);
  const match = path.match(pathRegExp);
  const pathVariables: PathVariables = {};
  if ((match?.index ?? 0) > 0) {
    prefix = path.substring(0, match!.index);
  }
  return [prefix, Object.entries(match?.groups ?? {}).reduce(
    (acc: PathVariables, [variableName, value]:[string, string]) => {
      if (!!value && (variableName in componentsByVariable)) {
        // cast is safe, as variableName must be a PathTemplateVariable to be
        // a key in componentsByVariable.
        const pathVariableName = variableName as PathTemplateVariable;
        const component = componentsByVariable[pathVariableName]
        acc[pathVariableName] = decodePathComponent(value, component.encoding ?? DEFAULT_ENCODING);
      }
      return acc;
    },
    pathVariables)];
}

export type ParsedURL = {
  url: URL,
  pathPrefix: string,
  pathVariables: PathVariables
  searchVariables: SearchVariables
  fragment?: string
}

export const parseSearchVariables = (rawSearchParams: string): Record<string, string> => Object.fromEntries((new URLSearchParams(rawSearchParams)).entries());

export const parseURL = (pathTemplate: PathTemplate, url: string): ParsedURL => {
  const parsedURL = new URL(url);
  const [pathPrefix, pathVariables] = parseURLPath(pathTemplate, parsedURL.pathname);
  return {
    url: parsedURL,
    pathPrefix,
    pathVariables,
    searchVariables: parseSearchVariables(parsedURL.search),
    fragment: !!parsedURL.hash ? urlHashToFragmentName(parsedURL.hash) : undefined
  }
}

export const createURLPath = (pathTemplate: PathTemplate, pathVariables: PathVariables): string => {
  return pathTemplate.reduce((pathAcc: string, pathComponent: PathTemplateComponent) => {
    const value = pathVariables[pathComponent.variableName];
    if (value) {
      return pathAcc + `/${pathComponent.shortName}/${encodePathComponent(value, pathComponent.encoding ?? DEFAULT_ENCODING)}`
    }
    return pathAcc;
  }, "")
}

export const createURL = (
  pathTemplate: PathTemplate,
  baseURL: string,
  pathVariables: PathVariables,
  searchVariables?: SearchVariables,
  fragment?: string): string => {
  const {url, pathPrefix, pathVariables: basePathVariables, fragment: baseFragment} = parseURL(pathTemplate, baseURL);
  const mergedPathVariables = Object.assign({}, basePathVariables, pathVariables);
  const effectiveFragment = fragment ?? baseFragment;
  url.pathname = pathPrefix + createURLPath(pathTemplate, mergedPathVariables);
  if (searchVariables) {
    url.search = new URLSearchParams(searchVariables).toString();
  }
  if (!!effectiveFragment) {
    url.hash = fragmentNameToURLHash(effectiveFragment, false);
  }
  return url.href;
}
