import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'apps/**/*.ts',
    'libs/**/*.ts',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/index.ts',
    '!**/*.port.ts',
    '!**/*.spec.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/apps/', '<rootDir>/libs/'],
  moduleNameMapper: {
    '@contracts/(.*)': '<rootDir>/libs/contracts/src/$1',
    '@contracts': '<rootDir>/libs/contracts/src/index',
    '@common/(.*)': '<rootDir>/libs/common/src/$1',
    '@common': '<rootDir>/libs/common/src/index',
    '@kafka/(.*)': '<rootDir>/libs/kafka/src/$1',
    '@kafka': '<rootDir>/libs/kafka/src/index',
    '@logger/(.*)': '<rootDir>/libs/logger/src/$1',
    '@logger': '<rootDir>/libs/logger/src/index',
  },
  clearMocks: true,
  restoreMocks: true,
};

export default config;
