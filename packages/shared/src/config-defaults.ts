import { DEFAULT_LAUNCH_PARAMETERS, DEFAULT_URL_CONFIG } from "./constants";
import { TiddlybaseConfig } from "./tiddlybase-config-schema";

export const mergeConfigDefaults = (config: TiddlybaseConfig):TiddlybaseConfig => {
  return {
    ...config,
    urls: Object.assign({}, DEFAULT_URL_CONFIG, config?.urls),
    defaultLaunchParameters: Object.assign({}, DEFAULT_LAUNCH_PARAMETERS, config?.defaultLaunchParameters),
  };
}
