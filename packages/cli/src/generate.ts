import { getJWTRoleClaim, getStorageConfig } from '@tiddlybase/shared/src/tiddlybase-config-schema';
import { joinPaths } from '@tiddlybase/shared/src/join-paths';
import { Arguments, Argv, CommandModule } from 'yargs';
import { ParsedConfig, readConfig, requireSingleConfig } from './config';
import { dirname, resolve } from 'path';
import { render } from 'mustache';
import {readFileSync} from 'fs';
// import { render } from 'mustache';

const RULES_WILDCARD_SUFFIX = '{allPaths=**}';
const FILENAME_STORAGE_RULES = "storage.rules";
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
    /*
    "firestore": {
      "rules": "etc/firestore.rules"
    },
    */
    "functions": configs.some(c => c.config.functions) ? {
      "source": "dist/functions",
      "ignore": ["**/.runtimeconfig.json", "**/node_modules/**"]
    } : undefined,
    // list all sites with `yarn firebase hosting:sites:list`
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
      "site": config?.hosting?.site ?? config.clientConfig.projectId,
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

const generateStorageRules = (configs: ParsedConfig[]) => `rules_version = '2';
service firebase.storage {
    match /b/{bucket}/o {
        ${configs.map(({ config }) => `
        function hasReadAccess() {
          return request.auth.token["${getJWTRoleClaim(config)}"] is number && request.auth.token["${getJWTRoleClaim(config)}"] > 0;
        }
        // files dir, containing files
        match ${joinPaths('/', getStorageConfig(config).filesPath, RULES_WILDCARD_SUFFIX)} {
            // allow read if custom claim set
            allow get: if hasReadAccess();
            // don't allow lists:
            allow list: if false;
            // don't allow updates:
            allow update: if false;
            // don't allow creates:
            allow create: if false;
            // don't allow deleles:
            allow delete: if false;
        }
        // wiki dir, containing wiki
        match ${joinPaths('/', getStorageConfig(config).tiddlerCollectionsPath, RULES_WILDCARD_SUFFIX)} {
            // allow read if custom claim set
            allow get: if hasReadAccess();
            // don't allow lists:
            allow list: if false;
            // don't allow updates:
            allow update: if false;
            // don't allow creates:
            allow create: if false;
            // don't allow deleles:
            allow delete: if false;
        }
          `)
  }

    }
}
`;

export const cmdGenerateStorageRules: CommandModule = {
  command: 'generate:storage.rules',
  describe: 'generate Firebase Storage rules',
  builder: (argv: Argv) => argv,
  handler: async (args: Arguments) => {
    const configFilePath = args['config'] as string | string[];
    console.log(
      generateStorageRules(
        readConfig(configFilePath)));
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

export const cmdGenerateIndexHTML: CommandModule = {
  command: 'generate:index.html',
  describe: 'generate HTML file for single-page app top-level frame',
  builder: (argv: Argv) => argv,
  handler: async (args: Arguments) => {
    const config = requireSingleConfig(args);
    console.log(renderMustacheTemplate('index.html.mustache', {config}));
  }
};


