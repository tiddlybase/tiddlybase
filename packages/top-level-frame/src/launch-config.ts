
import { ParsedSearchParams } from "packages/shared/src/search-params";
import { DEFAULT_BUILD_NAME, DEFAULT_LAUNCH_CONFIG, DEFAULT_WIKI_NAMES, SEARCH_PARAM_BUILD, SEARCH_PARAM_LAUNCH_CONFIG, SEARCH_PARAM_WIKI } from "@tiddlybase/shared/src/constants";
import type { TiddlybaseConfig, WikiLaunchConfig } from "packages/shared/src/tiddlybase-config-schema";

const parseWikiNames = (joinedWikiNames:string) => joinedWikiNames.split(",").map(s => s.trim());
const getWikiNames = (searchParams: ParsedSearchParams, launchConfig?:WikiLaunchConfig) => {
  if (searchParams[SEARCH_PARAM_WIKI]) {
    return parseWikiNames(searchParams[SEARCH_PARAM_WIKI]);
  }
  if (launchConfig?.wikiNames) {
    return launchConfig.wikiNames;
  }
  return parseWikiNames(DEFAULT_WIKI_NAMES);
}

export const getLaunchConfig = (searchParams:ParsedSearchParams={}, config?: TiddlybaseConfig): WikiLaunchConfig => {
  // was there a launchConfig in the URL and it refers to an existing launchConfig, use that.
  // if not (or if a value is missing), use the searchParam or default value.
  const launchConfigName = searchParams[SEARCH_PARAM_LAUNCH_CONFIG] ?? DEFAULT_LAUNCH_CONFIG;
  const launchConfig:WikiLaunchConfig|undefined = config?.launchConfigs?.[launchConfigName];
  const build = searchParams[SEARCH_PARAM_BUILD] ?? launchConfig?.build ?? DEFAULT_BUILD_NAME;
  const wikiNames = getWikiNames(searchParams, launchConfig);
  const settings = launchConfig?.settings ?? {}
  return {
    build,
    wikiNames,
    settings
  }
}
