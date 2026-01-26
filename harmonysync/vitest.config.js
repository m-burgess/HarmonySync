import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/services/**/*.js', 'src/viewmodels/**/*.js'],
      exclude: ['src/**/__tests__/**', 'src/**/index.js'],
    },
  },
});
