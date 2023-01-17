// from: https://stackoverflow.com/a/73038898
import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    verbose: true,
    globals: {
        'ts-jest': {
            tsconfig: './tsconfig.json',
            useESM: true
        }
    },
    coverageProvider: 'v8',
    transformIgnorePatterns: ['<rootDir>/node_modules/']
};
export default config;
