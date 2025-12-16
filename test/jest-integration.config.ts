import type { Config } from 'jest';
import jestConfig from './jest-config.base';

const config: Config = {
  ...jestConfig,
  rootDir: '..',
  testRegex: '.*\\.integration.spec.ts$',
  reporters: ['default', ['summary', { summaryThreshold: 1 }]],
  verbose: true,
  bail: 1,
};

export default config;
