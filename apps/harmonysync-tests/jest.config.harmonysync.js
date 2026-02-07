export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  silent: true,
  testMatch: [
    '**/harmonysync/src/__tests__/**/*.test.ts',
    '**/harmonysync/src/__tests__/**/*.test.js',
    '**/testing/smoke-tests/**/*.ts',
    '**/testing/utils/electron-tests/**/*.test.ts',
    '**/coverage-tests/**/*.test.ts',
    '**/smoke-tests/**/*.test.ts',
    '**/unit-tests/**/*.test.ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)'
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    '^@harmonysync-tests/(.*)$': '<rootDir>/$1',
    '^@harmonysync-tests$': '<rootDir>/index.ts',
  },
  collectCoverageFrom: [
    'harmonysync/src/services/**/*.ts',
    'harmonysync/src/viewmodels/**/*.ts',
    'harmonysync/src/services/**/*.js',
    'harmonysync/src/viewmodels/**/*.js',
    '!harmonysync/src/**/__tests__/**'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  extensionsToTreatAsEsm: ['.jsx', '.tsx'],
};
