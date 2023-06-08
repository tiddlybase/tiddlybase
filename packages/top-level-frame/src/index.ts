import type { TiddlybaseClientConfig } from '@tiddlybase/shared/src/tiddlybase-config-schema';
import { parseSearchParams } from '@tiddlybase/shared/src/search-params'
import { TopLevelApp } from './app';

declare global {
  interface Window { tiddlybaseClientConfig: TiddlybaseClientConfig; }
}

const init = async () => {
  const app = new TopLevelApp(
    window.tiddlybaseClientConfig,
    parseSearchParams(window.location.search));
  app.initApp();
};

window.addEventListener('load', init);
