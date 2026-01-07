import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  clearScreen: false,
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**', '**/electron/**', '**/node_modules/**']
    },
  },
  envPrefix: ['VITE_'],
  build: {
    target: 'es2022',
    minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
    sourcemap: process.env.NODE_ENV === 'development',
    outDir: 'dist',
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