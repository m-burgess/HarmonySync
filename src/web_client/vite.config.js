import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The desktop app's Settings dialog shows a QR code for http://<host-LAN-IP>:3000,
// so both the dev server and `vite preview` must listen on all interfaces at
// exactly port 3000 (strictPort: fail loudly instead of silently moving to 3001).
const lanServer = {
  host: true, // Listen on all local IPs
  port: 3000,
  strictPort: true,
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: lanServer,
  preview: lanServer,
})
