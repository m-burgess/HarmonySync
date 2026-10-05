# HarmonySync Musician View (web client)

A small React + Vite web app that musicians open on their phones to follow the
current song's chords and lyrics. The HarmonySync desktop app (C++/Qt) is the
host; this is the only Node/npm part of the repository.

## How it connects

1. The desktop app's **Settings** dialog (`src/qml/components/SettingsDialog.qml`)
   shows a QR code for `http://<host-LAN-IP>:3000`. Phones scan it to open this app.
2. The page then opens a WebSocket back to the same host on port **8080**
   (`RemoteApiServer` in `src/core/services/`). The host pushes
   `{"event": "SONG_MAP_UPDATED", "payload": "<song-map.json as a string>"}` on
   connect and whenever the current song or its map changes. An empty payload
   means no song is active.
3. The client renders the song map's `sections` (Nashville-number chords are
   transposed to the selected key) and pre-selects the song's `key`
   (`originalKey` in older maps).

The phone must be on the same network as the desktop, and ports 3000 and 8080
must be reachable through the host's firewall.

## Development

Requires Node `^20.19.0 || >=22.12.0` (Vite 8).

```bash
cd src/web_client
npm ci
npm run dev       # serves on 0.0.0.0:3000 (fails if 3000 is taken, so the QR code stays valid)
npm run lint      # oxlint
npm test          # node:test unit tests for src/lib
npm run build     # production build into dist/
npm run preview   # serve dist/ on 0.0.0.0:3000
```

`run_host_and_web.sh` / `run_both.sh` in the repo root start the desktop app and
`npm run dev` together.

Set `VITE_WS_PORT` (e.g. in `.env.local`) if the desktop WebSocket server runs on
a port other than 8080.
