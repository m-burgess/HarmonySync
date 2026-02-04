import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
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
