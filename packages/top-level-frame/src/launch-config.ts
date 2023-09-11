
import { DEFAULT_AUTH, DEFAULT_BUILD_NAME, DEFAULT_LAUNCH_CONFIG } from "@tiddlybase/shared/src/constants";
import type { FilesConfig, LaunchConfig, LaunchParameters, TiddlersConfig, TiddlybaseClientConfig } from "packages/shared/src/tiddlybase-config-schema";

export const getNormalizedLaunchConfig = (config: TiddlybaseClientConfig, launchParameters:LaunchParameters): LaunchConfig => {
  // was there a launchConfig in the URL and it refers to an existing launchConfig, use that.
  // if not (or if a value is missing), use the searchParam or default value.
  const launchConfigName = launchParameters.launchConfig ?? DEFAULT_LAUNCH_CONFIG;
  const launchConfig:Partial<LaunchConfig>|undefined = config?.launchConfigs?.[launchConfigName];
  if (!launchConfig) {
    throw Error(`Undefined launch config '${launchConfigName}' requested`)
  }

  const tiddlers:TiddlersConfig = launchConfig?.tiddlers ?? {sources: []}
  const files:FilesConfig = launchConfig?.files ?? {sources: []}

  return {
    build: launchConfig.build ?? DEFAULT_BUILD_NAME,
    auth: launchConfig.auth ?? DEFAULT_AUTH,
    tiddlers,
    files,
    functions: launchConfig.functions
  }
}
