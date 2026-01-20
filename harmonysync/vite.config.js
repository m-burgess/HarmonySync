import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  clearScreen: false,
  plugins: [react()],
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
    },
  },
});