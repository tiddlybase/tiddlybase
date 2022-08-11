import { TiddlybaseConfig } from '@tiddlybase/shared/src/tiddlybase-config-schema';
import { readFileSync } from 'fs';
import { Arguments } from 'yargs';

export const readJSON = (filename: string): ParsedConfig => ({ filename, config: JSON.parse(readFileSync(filename, { encoding: 'utf-8' })) });

export interface ParsedConfig {
  filename: string,
  config: TiddlybaseConfig
}

export const readConfig = (filename: string | string[]): Array<ParsedConfig> => {
  // TODO: a schema check would be useful
  return (typeof filename === 'string' ? [filename] : filename).map(readJSON)
}

export const requireSingleConfig = (args: Arguments): TiddlybaseConfig => {
  const configFilePaths = args['config'] as string | string[];
  const parsedConfigs = readConfig(configFilePaths);
  if (parsedConfigs.length !== 1) {
    throw new Error('Expecting a single tiddlybase-config.json')
  }
  return parsedConfigs[0].config;
}
