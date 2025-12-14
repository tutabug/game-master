import type { Config } from 'jest';
import { jestConfig } from './jest-config.base';

export const jestUnitConfig: Config = {
  ...jestConfig,
  rootDir: '..',
  testRegex: '^(?!.*\\.(component|integration)\\.spec\\.ts$).*.spec.ts$',
  reporters: [['summary', { summaryThreshold: 1 }]],
};

export default jestUnitConfig;
