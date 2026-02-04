module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // include centralized harmonysync-tests for POC discovery
  roots: ['<rootDir>', '<rootDir>/../harmonysync-tests/harmonysync-audio-service/unit-tests'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleFileExtensions: ['ts','js','json','node'],
  testTimeout: 20000
};
