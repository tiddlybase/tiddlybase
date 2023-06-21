import { TiddlybaseConfig } from '@tiddlybase/shared/src/tiddlybase-config-schema';
import { readFileSync } from 'fs';
import { Arguments } from 'yargs';
import Ajv from 'ajv';
import { default as tiddlybaseConfigSchema } from "@tiddlybase/shared/src/generated/tiddlybase-config-schema.json";


export const getValidator = () => {
  const ajv = new Ajv({ verbose: true, allErrors: true });
  ajv.addSchema(tiddlybaseConfigSchema);
  const validate = ajv.getSchema<TiddlybaseConfig>('#/definitions/TiddlybaseConfig');
  if (validate !== undefined) {
    return (data: any) => {
      const valid = validate(data);
      return { valid, errors: validate.errors };
    };
  }
  throw new Error('Could not initialize AJV with TiddlybaseConfig schema');
}

const validator = getValidator();

export const rawReadJSON = (filename: string) => JSON.parse(readFileSync(filename, { encoding: 'utf-8' }))

export const readJSON = (filename: string): ParsedConfig => {
  const config = rawReadJSON(filename);
  const {valid, errors} = validator(config);
  if (!valid) {
    console.error(`Config validation error:\n${JSON.stringify(errors, null, 4)}`);
    throw new Error(`Invalid config in ${filename}`)
  }
  return ({ filename, config});
}

export interface ParsedConfig {
  filename: string,
  config: TiddlybaseConfig
}

export const readConfig = (filename: string | string[]): Array<ParsedConfig> => {
  // TODO: a schema check would be useful
  return (typeof filename === 'string' ? [filename] : filename).map(readJSON)
}

export const requireSingleConfig = (args: Arguments) => {
  const configFilePaths = args['config'] as string | string[];
  const parsedConfigs = readConfig(configFilePaths);
  if (parsedConfigs.length !== 1) {
    throw new Error('Expecting a single tiddlybase-config.json')
  }
  return { config: parsedConfigs[0].config, path: configFilePaths as string };
}
