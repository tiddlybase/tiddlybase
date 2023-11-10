import { DEFAULT_LAUNCH_PARAMETERS } from "@tiddlybase/shared/src/constants";
import { PathTemplate } from "@tiddlybase/shared/src/path-template";
import { LaunchParameters } from "@tiddlybase/shared/src/tiddlybase-config-schema";
import { parseURLPath } from "@tiddlybase/shared/src/path-template-utils";

export const parseSearchParameters = (rawSearchParams: string): Record<string, string> => Object.fromEntries((new URLSearchParams(rawSearchParams)).entries());


export const parseLaunchParameters = (
  url: URL | typeof window.location,
  pathTemplate: PathTemplate,
  defaults: Partial<LaunchParameters> = {}): LaunchParameters => {
  const launchParameters: LaunchParameters = Object.assign(
    {},
    DEFAULT_LAUNCH_PARAMETERS,
    defaults,
    { searchParameters: parseSearchParameters(url.search) });
  const [_prefix, pathParameters] = parseURLPath(pathTemplate, url.pathname);
  if (pathParameters['instance']) {
    launchParameters.instance = pathParameters.instance;
  }
  if (pathParameters['launchConfig']) {
    launchParameters.launchConfig = pathParameters.launchConfig;
  }
  return launchParameters;
}
