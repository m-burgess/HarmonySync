export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/harmonysync/src/__tests__/**/*.test.ts',
    '**/harmonysync/src/__tests__/**/*.test.js',
    '**/testing/smoke-tests/**/*.ts',
    '**/testing/utils/electron-tests/**/*.test.ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }]
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
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
