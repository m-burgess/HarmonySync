import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  clearScreen: false,
  plugins: [
    react({
      babel: {
        parserOpts: {
          plugins: ['decorators-legacy', 'typescript'],
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    host: false,
    hmr: undefined,
    watch: { ignored: [] },
  },
  envPrefix: ['VITE_'],
  build: {
    target: 'es2022',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: 'index.html',
        audience: 'audience.html',
        confidence: 'confidence.html',
        lowerthirds: 'lowerthirds.html',
        'preservice-music': 'preservice-music.html',
        scheduler: 'scheduler.html',
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022',
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          useDefineForClassFields: false,
        }
      }
    },
  },
});