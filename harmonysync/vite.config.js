import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const host = process.env.TAURI_DEV_HOST;
export default defineConfig({
  clearScreen: false,
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    target: 'es2022',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    rollupOptions: {
              input: {
                main: 'index.html',
                audience: 'audience.html',
                confidence: 'confidence.html',
                lowerthirds: 'lowerthirds.html',
                'preservice-music': 'preservice-music.html',
                scheduler: 'scheduler.html',
                'plugin-manager': 'plugin-manager.html',
              },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022',
    },
  },
});