module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/electron'],
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
