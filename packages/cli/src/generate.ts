import { LaunchConfig, TIDDLYBASE_CLIENT_CONFIG_KEYS, TiddlybaseClientConfig, TiddlybaseConfig } from '@tiddlybase/shared/src/tiddlybase-config-schema';
import { objFilter } from '@tiddlybase/shared/src/obj-utils';
import { DEFAULT_LAUNCH_PARAMETER_DOMAIN, DEFAULT_URL_CONFIG } from '@tiddlybase/shared/src/constants';
import { Arguments, Argv, CommandModule, Options } from 'yargs';
import { ParsedConfig, readConfig, requireSingleConfig } from './config';
import { dirname, resolve, join } from 'path';
import { render } from 'mustache';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { runCommand } from './run-child-process';

const FIREBASE_RULES_FILENAMES = {
  STORAGE: "storage.rules",
  FIRESTORE: "firestore.rules"
}

export const OUTPUT_FILENAME_CLI_OPTION: Record<string, Options> = {
  o: {
    type: 'string', alias: 'output', describe: 'filename to write output to'
  }
};

export const CONFIG_DIR_CLI_OPTION: Record<string, Options> = {
  d: {
    type: 'string', alias: 'config-dir', default: "etc", describe: "directory containing config files such as firebase rules"
  }
};

export const FIREBASE_PROJECT_CLI_OPTION: Record<string, Options> = {
  project: {
    type: 'string', describe: "firebase project to use"
  }
};

const ensureDirExists = (dir: string) => mkdirSync(dir, { recursive: true });

const writeFile = (filename: string, data: string) => {
  const dir = dirname(filename);
  ensureDirExists(dir);
  writeFileSync(
    filename,
    data,
    { encoding: 'utf-8' });
}


const writeJSON = (filename: string, obj: any) => writeFile(filename, JSON.stringify(obj, null, 4));

const getOutputFilename = (args: Arguments, fallback: string) => (args['output'] as string | undefined) ?? fallback;

const getConfigDir = (args: Arguments) => args['config-dir'] as string;

const renderMustacheTemplate = (templateFile: string, vars: any) => {
  const filename = resolve(__dirname, '..', 'templates', templateFile);
  return render(readFileSync(filename, { encoding: 'utf-8' }), vars);
}

const FIREBASE_JSON_HOSTRING_CORS_HEADERS = {
  "source": "**/*.@(eot|otf|ttf|ttc|woff|woff2|font.css|json)",
  "headers": [{
    "key": "Access-Control-Allow-Origin",
    "value": "*"
  }]
};

const FIREBASE_JSON_HOSTING_IGNORE = [
  "**/types/**",
  "firebase.json",
  "**/.*",
  "**/node_modules/**",
  "files",
  "files/**",
  "public/files",
  "public/files/**"
];

const FIREBASE_JSON_EMULATORS = {
  "auth": {
    "port": 9099
  },
  "firestore": {
    "port": 8080
  },
  "hosting": {
    "port": 5000
  },
  "storage": {
    "port": 9199
  },
  "ui": {
    "enabled": true
  }
}

const generateHostingConfig = (config: TiddlybaseConfig) => (
  {
    // by default, the site is the same as the projectid
    site: config.firebase?.hosting?.site ?? config.firebase?.clientConfig.projectId,
    "public": config.urls?.publicPath ?? DEFAULT_URL_CONFIG.publicPath,
    "rewrites": [{
      "source": "**",
      "destination": `/${config.urls?.outerHTML ?? DEFAULT_URL_CONFIG.outerHTML}`
    }],
    "ignore": FIREBASE_JSON_HOSTING_IGNORE,
    "headers": [FIREBASE_JSON_HOSTRING_CORS_HEADERS]
  }
);

const generateFirebaseJson = (
  configDir: string,
  configs: ParsedConfig[]) => ({
    "storage": {
      "rules": join(configDir, FIREBASE_RULES_FILENAMES.STORAGE)
    },
    "firestore": {
      "rules": join(configDir, FIREBASE_RULES_FILENAMES.FIRESTORE)
    },
    // TODO: functions!
    //
    //"functions": configs.some(c => c.config.functions) ? {
    //  "source": "dist/functions",
    //  "ignore": ["**/.runtimeconfig.json", "**/node_modules/**"]
    //} : undefined,
    // list all sites with `yarn firebase hosting:sites:list`
    "hosting": configs.map(({ config }) => generateHostingConfig(config)),
    "emulators": FIREBASE_JSON_EMULATORS
  });

type FirebaseRule = keyof typeof FIREBASE_RULES_FILENAMES;

const writeFirebaseRule = (args: Arguments, rulesType: FirebaseRule) => {
  const dir = getConfigDir(args);
  ensureDirExists(dir);
  const contents = renderMustacheTemplate(`${FIREBASE_RULES_FILENAMES[rulesType]}.mustache`, {})
  writeFile(join(dir, FIREBASE_RULES_FILENAMES[rulesType]), contents);
}

export const cmdGenerateStorageRules: CommandModule = {
  command: 'generate:storage.rules',
  describe: 'generate Firebase Storage rules',
  builder: (argv: Argv) => argv.options({
    ...CONFIG_DIR_CLI_OPTION
  }),
  handler: async (args: Arguments) => {
    writeFirebaseRule(args, "STORAGE");
  },
};

export const cmdGenerateFirestoreRules: CommandModule = {
  command: 'generate:firestore.rules',
  describe: 'generate Firestore rules',
  builder: (argv: Argv) => argv.options({
    ...CONFIG_DIR_CLI_OPTION
  }),
  handler: async (args: Arguments) => {
    writeFirebaseRule(args, "FIRESTORE");
  },
};

const getFirebaseClientConfig = async (project?: string): Promise<Exclude<TiddlybaseConfig["firebase"], undefined>["clientConfig"]> => {
  const firebaseCLIPath = join(dirname(__non_webpack_require__.resolve('firebase-tools')), "bin", "firebase.js")
  console.log("Invoking firebase binary at " + firebaseCLIPath);
  const { stdout } = await runCommand(`node ${firebaseCLIPath} ${project ? `--project ${project} ` : ''} apps:sdkconfig web`);
  const sdkOutput = stdout.trim();
  const prefix = 'firebase.initializeApp('
  const suffix = ');';
  return JSON.parse(sdkOutput.substring(sdkOutput.indexOf(prefix) + prefix.length, sdkOutput.length - suffix.length));
}

const DEFAULT_LAUNCH_CONFIG: Partial<LaunchConfig> = {
  "auth": {
    "type": "firebase",
    "writeToFirestore": true,
    "firebaseui": {
      "signInFlow": "redirect",
      "signInOptions": [{ "provider": "google.com" }],
      "tosUrl": "/tos.html",
      "privacyPolicyUrl": "/privacy.html",
      "credentialHelper": "googleyolo"
    }
  },
  tiddlers: {
    "tiddlerStorage": [
      { "type": "http", "url": "/tiddlybase_public/plugins/plugins-default.json" },
      { "type": "firestore", "collection": "user:$USERID", "writeCondition": "private" },
      { "type": "firestore", "collection": "shared" }
    ]
  },

}

export const cmdGenerateTiddlybaseConfigJson: CommandModule = {
  command: 'generate:tiddlybase-config.json instance',
  describe: 'generate tiddlybase configuration',
  builder: (argv: Argv) => argv
    .options({
      ...OUTPUT_FILENAME_CLI_OPTION,
      ...FIREBASE_PROJECT_CLI_OPTION
    })
    .positional('instance', {
      describe: 'Instance name used for Tiddlybase config',
      type: 'string',
    }),
  handler: async (args: Arguments) => {
    const outputFilename = getOutputFilename(args, 'tiddlybase-config.json');
    const instance = args.instance as string;
    const tiddlybaseConfig: TiddlybaseConfig = {
      htmlGeneration: {
        title: instance
      },
      firebase: {
        clientConfig: await getFirebaseClientConfig(args.project as string | undefined)
      },
      launchConfigs: {
        default: DEFAULT_LAUNCH_CONFIG
      },
      defaultLaunchParameters: {
        [DEFAULT_LAUNCH_PARAMETER_DOMAIN]: {instance}
      }
    }
    writeJSON(
      outputFilename,
      tiddlybaseConfig);
    console.log(`Output written to ${outputFilename}`)
  },
};

export const cmdGenerateFirebaseJson: CommandModule = {
  command: 'generate:firebase.json',
  builder: (argv: Argv) => argv
    .options({
      ...OUTPUT_FILENAME_CLI_OPTION,
      ...CONFIG_DIR_CLI_OPTION
    }),
  handler: async (args: Arguments) => {
    const configFilePaths = args['config'] as string | string[];
    const parsedConfigs = readConfig(configFilePaths);
    const configDir = getConfigDir(args);
    const filename = getOutputFilename(args, 'firebase.json');

    writeJSON(
      filename,
      generateFirebaseJson(
        configDir,
        parsedConfigs));
  },
};

export const cmdGenerateOuterHTML: CommandModule = {
  command: 'generate:outer.html',
  describe: 'generate HTML file for single-page app top-level frame',
  builder: (argv: Argv) => argv.options(OUTPUT_FILENAME_CLI_OPTION),
  handler: async (args: Arguments) => {
    const { config } = requireSingleConfig(args, false);
    const clientConfig = objFilter<keyof TiddlybaseClientConfig, any>((k) => TIDDLYBASE_CLIENT_CONFIG_KEYS.includes(k), config) as TiddlybaseClientConfig;
    const stringifiedClientConfig = JSON.stringify(clientConfig);
    const outputFilename = getOutputFilename(args, join(config.urls?.publicPath ?? DEFAULT_URL_CONFIG.publicPath, config.urls?.outerHTML ?? DEFAULT_URL_CONFIG.outerHTML));
    writeFile(
      outputFilename,
      renderMustacheTemplate('outer.html.mustache', {
        htmlGeneration: config.htmlGeneration,
        stringifiedClientConfig
      }));
    console.log(`Output written to ${outputFilename}`)
  }
};


