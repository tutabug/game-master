import type { Config } from 'jest';

export const jestConfig: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
  },
  testRegex: '.*.spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { useESM: true }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './reports/coverage',
  testEnvironment: 'node',
  // Increase the timeout because it takes time to start the database
  testTimeout: 120000,
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/reports/'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/tests/config/',
    'jest.config.ts',
    'eslintrc.js',
    '/src/index.ts',
  ],
};

export default jestConfig;
