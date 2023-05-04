// from: https://stackoverflow.com/a/73038898
import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'jsdom',
    verbose: true,
    coverageProvider: 'v8',
    transform: {
        'test/*.tsx?': ['ts-jest', { 
            tsconfig: './tsconfig.json',
            useESM: true
        }],
    },
    transformIgnorePatterns: ['<rootDir>/node_modules/']
};
export default config;
