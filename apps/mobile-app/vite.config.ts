import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        proxy: {
            '/api': 'http://localhost:3000',
            '/ws': {
                target: 'ws://localhost:3000',
                ws: true,
            },
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
})
