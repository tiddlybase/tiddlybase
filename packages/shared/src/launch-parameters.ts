import { DEFAULT_LAUNCH_PARAMETERS, DEFAULT_URL_CONFIG } from "./constants";
import { objFilter } from "./obj-filter";
import { LaunchParameters } from "./tiddlybase-config-schema";

export const parseSearchParams = (rawSearchParams: string): Record<string, string> => Object.fromEntries((new URLSearchParams(rawSearchParams)).entries());

export const parsePathParameters = (path: string, re?: string) => {
  const match = decodeURIComponent(path).match(new RegExp(re ?? DEFAULT_URL_CONFIG.pathRegexp));
  return objFilter((_k, v) => !!v, match?.groups ?? {});
}

export const parseLaunchParameters = (url: URL | typeof window.location, defaults: Partial<LaunchParameters> = {}, pathRegexp?: string): LaunchParameters => Object.assign(
  {},
  DEFAULT_LAUNCH_PARAMETERS,
  defaults,
  parsePathParameters(url.pathname, pathRegexp),
  {getParameters: parseSearchParams(url.search)});
