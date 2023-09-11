import type { TiddlybaseClientConfig } from '@tiddlybase/shared/src/tiddlybase-config-schema';
import { TopLevelApp } from './app';

declare global {
  interface Window { tiddlybaseClientConfig: TiddlybaseClientConfig; }
}

const init = async () => {
  const app = new TopLevelApp(window.tiddlybaseClientConfig);
  app.initApp();
};

window.addEventListener('load', init);
