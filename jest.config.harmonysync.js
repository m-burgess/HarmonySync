export default {
  testEnvironment: 'node',
  testMatch: [
    '**/harmonysync/src/__tests__/**/*.test.js'
  ],
  transform: {},
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
  },
  collectCoverageFrom: [
    'harmonysync/src/services/**/*.js',
    'harmonysync/src/viewmodels/**/*.js',
    '!harmonysync/src/**/__tests__/**'
  ],
  moduleFileExtensions: ['js', 'jsx'],
  extensionsToTreatAsEsm: ['.jsx'],
};
