import {TiddlybaseConfig} from '@tiddlybase/shared/src/tiddlybase-config-schema';
import {readFileSync} from 'fs';

const readJSON = (filename:string):ParsedConfig => ({filename, config: JSON.parse(readFileSync(filename, { encoding: 'utf-8' }))});

export interface ParsedConfig {
  filename: string,
  config: TiddlybaseConfig
}

export const readConfig = (filename:string|string[]):Array<ParsedConfig> => {
  // TODO: a schema check would be useful
  return (typeof filename === 'string' ? [filename] : filename).map(readJSON)
}
