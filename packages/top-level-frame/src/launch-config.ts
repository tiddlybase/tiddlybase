
import { ParsedSearchParams } from "packages/shared/src/search-params";
import { DEFAULT_AUTH, DEFAULT_BUILD_NAME, DEFAULT_LAUNCH_CONFIG, SEARCH_PARAM_LAUNCH_CONFIG } from "@tiddlybase/shared/src/constants";
import type { LaunchConfig, TiddlybaseClientConfig } from "packages/shared/src/tiddlybase-config-schema";

export const getNormalizedLaunchConfig = (searchParams:ParsedSearchParams={}, config?: TiddlybaseClientConfig): LaunchConfig => {
  // was there a launchConfig in the URL and it refers to an existing launchConfig, use that.
  // if not (or if a value is missing), use the searchParam or default value.
  const launchConfigName = searchParams[SEARCH_PARAM_LAUNCH_CONFIG] ?? DEFAULT_LAUNCH_CONFIG;
  const launchConfig:Partial<LaunchConfig>|undefined = config?.launchConfigs?.[launchConfigName];
  if (!launchConfig) {
    throw Error(`Undefined launch config '${launchConfigName}' requested`)
  }

  return {
    sources: launchConfig.sources ?? [],
    build: launchConfig.build ?? DEFAULT_BUILD_NAME,
    wikiInfoConfig: launchConfig?.wikiInfoConfig ?? {},
    isLocal: launchConfig.isLocal === true,
    auth: launchConfig.auth ?? DEFAULT_AUTH
  }
}
