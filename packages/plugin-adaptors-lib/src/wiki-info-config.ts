import { WikiInfoConfigKey } from "packages/tw5-types/src";

const WIKI_INFO_CONFIG_TIDDLER = '$:/config/wikiInfoConfig';

export const getWikiInfoConfigValue = (key: WikiInfoConfigKey) => $tw?.boot?.wikiInfo?.config[key] ?? $tw?.wiki?.getTiddler(WIKI_INFO_CONFIG_TIDDLER)?.fields[key];
