import type { Config } from 'jest';
const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { useESM: true }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@common/(.*)\\.js$': '<rootDir>/src/common/$1',
    '^@config/(.*)\\.js$': '<rootDir>/src/config/$1',
    '^@modules/(.*)\\.js$': '<rootDir>/src/modules/$1',
    '^@journeys/(.*)\\.js$': '<rootDir>/src/modules/journeys/$1',
    '^@folders/(.*)\\.js$': '<rootDir>/src/modules/folders/$1',
    '^@tasks/(.*)\\.js$': '<rootDir>/src/modules/tasks/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    'libs/**/*.(t|j)s',
    'apps/**/*.(t|j)s',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};

export default config;
