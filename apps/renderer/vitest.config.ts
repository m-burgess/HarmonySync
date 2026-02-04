import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      { find: '@harmonysync-tests', replacement: path.resolve(__dirname, '../harmonysync-tests') },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx,js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      // enforce thresholds (global)
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
})
