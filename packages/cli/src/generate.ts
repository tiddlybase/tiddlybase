import { TIDDLYBASE_CLIENT_CONFIG_KEYS, TiddlybaseClientConfig } from '@tiddlybase/shared/src/tiddlybase-config-schema';
import { joinPaths } from '@tiddlybase/shared/src/join-paths';
import { objFilter } from '@tiddlybase/shared/src/obj-filter';
import { Arguments, Argv, CommandModule } from 'yargs';
import { ParsedConfig, readConfig, requireSingleConfig } from './config';
import { dirname, resolve } from 'path';
import { render } from 'mustache';
import {readFileSync} from 'fs';
// import { render } from 'mustache';

const FILENAME_STORAGE_RULES = "storage.rules";
const FILENAME_FIRESTORE_RULES = "storage.rules";
const DIRECTORY_PUBLIC = 'public'

const renderMustacheTemplate = (templateFile: string, vars:any) => {
  const filename = resolve(__dirname, '..', 'templates', templateFile);
  return render(readFileSync(filename, {encoding: 'utf-8'}), vars);
}


const generateFirebaseJson = (
  configDir: string,
  configs: ParsedConfig[]) => {
  return JSON.stringify({
    "storage": {
      "rules": joinPaths(configDir, FILENAME_STORAGE_RULES)
    },
    "firestore": {
      "rules": joinPaths(configDir, FILENAME_FIRESTORE_RULES)
    },
    "functions": configs.some(c => c.config.functions) ? {
      "source": "dist/functions",
      "ignore": ["**/.runtimeconfig.json", "**/node_modules/**"]
    } : undefined,
    // list all sites with `yarn firebase hosting:sites:list`
    // TODO: generating hosting setu pis currently broken
    "hosting": configs.map(({ config }) => ({
      // enable CORS headers so wiki tiddlers can be loaded during local
      // development
      "headers": [{
        "source": "/default-wiki.json",
        "headers": [{
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }]
      }],
      // default hosting id is same as project id
      "site": config?.hosting?.site ?? config.firebaseClientConfig.projectId,
      "public": DIRECTORY_PUBLIC,
      "rewrites": [
        { // SPA rewrite rule: any non-existing path is rewritten to index.html
          "source": `${config?.hosting?.pathPrefix ?? ''}**`,
          "destination": `${config?.hosting?.pathPrefix ?? ''}/index.html`
        }
      ],
      "ignore": [
        "**/types/**",
        "firebase.json",
        "**/.*",
        "**/node_modules/**",
        "etc/**"
      ]
    })
    )
  }, null, 4);
};

export const cmdGenerateStorageRules: CommandModule = {
  command: 'generate:storage.rules',
  describe: 'generate Firebase Storage rules',
  builder: (argv: Argv) => argv,
  handler: async (args: Arguments) => {
    console.log(renderMustacheTemplate('storage.rules.mustache', {}));
  },
};

export const cmdGenerateFirestoreRules: CommandModule = {
  command: 'generate:firestore.rules',
  describe: 'generate Firestore rules',
  builder: (argv: Argv) => argv,
  handler: async (args: Arguments) => {
    console.log(renderMustacheTemplate('firestore.rules.mustache', {}));
  },
};

export const cmdGenerateFirebaseJson: CommandModule = {
  command: 'generate:firebase.json',
  describe: 'generate main firebase config',
  builder: (argv: Argv) => argv
    .options({
      d: {
        type: 'string', alias: 'config-dir',
      }
    }),
  handler: async (args: Arguments) => {
    const configFilePaths = args['config'] as string | string[];
    const parsedConfigs = readConfig(configFilePaths);
    const configDir = (args['config-dir'] as string | undefined) ?? dirname(parsedConfigs[0].filename);
    console.log(
      generateFirebaseJson(
        configDir,
        parsedConfigs));
  },
};

export const cmdGenerateOuterHTML: CommandModule = {
  command: 'generate:outer.html',
  describe: 'generate HTML file for single-page app top-level frame',
  builder: (argv: Argv) => argv,
  handler: async (args: Arguments) => {
    const {config} = requireSingleConfig(args);
    const clientConfig = objFilter<keyof TiddlybaseClientConfig, any>((k) => TIDDLYBASE_CLIENT_CONFIG_KEYS.includes(k), config) as TiddlybaseClientConfig;
    const stringifiedClientConfig = JSON.stringify(clientConfig);
    console.log(renderMustacheTemplate('index.html.mustache', {htmlGeneration: config.htmlGeneration, stringifiedClientConfig}));
  }
};


