module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/electron', '<rootDir>/../harmonysync-tests/electron-app-tests/unit-tests'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  testTimeout: 10000,
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        module: 'commonjs',
        target: 'ES2022'
      }
    }]
  },
  moduleNameMapper: {
    '^@harmonysync-tests/(.*)$': '<rootDir>/../harmonysync-tests/$1'
  },
  moduleDirectories: ['node_modules', '<rootDir>/../harmonysync-tests'],
  collectCoverageFrom: [
    'electron/services/**/*.ts',
    '!electron/services/__tests__/**',
    '!electron/services/**/*.d.ts'
  ],
  coverageDirectory: 'coverage-electron',
  verbose: true,
  forceExit: true,
  detectOpenHandles: false
};
