# HarmonySync Audio Service

This directory contains the Node.js audio service used by HarmonySync for multitrack playback and mixing.

Environment variables
- HOST (optional) - network interface to bind to (default: `127.0.0.1`).
- PORT (optional) - port to listen on (default: `3001`).
- SHUTDOWN_TOKEN (optional but recommended) - token that must be supplied in the `x-shutdown-token` header (or `Authorization: Bearer <token>`) when calling `/api/shutdown`.

Quick start

Install deps and start the service (with a shutdown token):

```bash
cd harmonysync-audio-service
npm install
export SHUTDOWN_TOKEN="mysecret"
export HOST=127.0.0.1
export PORT=3001
npm start
```

Smoke test

Run the smoke test which calls `/api/health` and `/api/shutdown`:

```bash
export SHUTDOWN_TOKEN="mysecret"
npm run smoke-test
```

Notes
- For production, always set `SHUTDOWN_TOKEN` and ensure the service is only bound to localhost or secured network interfaces.
- The Tauri backend can generate and pass a random `SHUTDOWN_TOKEN` when spawning the service to tie lifecycle and security together.
