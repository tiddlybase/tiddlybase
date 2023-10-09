import { DEFAULT_LAUNCH_PARAMETER_DOMAIN, DEFAULT_LAUNCH_PARAMETERS, DEFAULT_URL_CONFIG } from "./constants";
import { LaunchParameters, TiddlybaseConfig } from "./tiddlybase-config-schema";

export type NormalizedTiddlybaseConfig = {
  tiddlybaseConfig: TiddlybaseConfig,
  defaultLaunchParameters: LaunchParameters
}

export const mergeConfigDefaults = (config: TiddlybaseConfig, domain?: string): NormalizedTiddlybaseConfig => {
  // if no domain passed, use "*"
  const effectiveDomain = domain ?? DEFAULT_LAUNCH_PARAMETER_DOMAIN;
  const defaultLaunchParameters = Object.assign(
    {},
    DEFAULT_LAUNCH_PARAMETERS,
    // if no defaultLaunchParameters available for domain, use the ones for "*"
    config?.defaultLaunchParameters?.[effectiveDomain] ?? config?.defaultLaunchParameters?.[DEFAULT_LAUNCH_PARAMETER_DOMAIN]
  );
  // override authDomain with current domain
  if (domain && domain !== 'localhost' && config.firebase?.clientConfig) {
    config.firebase.clientConfig.authDomain = domain;
  }
  return {
    tiddlybaseConfig: {
      ...config,
      urls: Object.assign({}, DEFAULT_URL_CONFIG, config?.urls),
    },
    defaultLaunchParameters
  };
}
