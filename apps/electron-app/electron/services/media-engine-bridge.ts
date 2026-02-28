import { BrowserWindow, ipcMain } from 'electron';
import WebSocket from 'ws';

export interface MediaEngineEvent {
    type: string;
    songId?: string;
    position?: number;
    [key: string]: any;
}

export class MediaEngineBridge {
    private ws: WebSocket | null = null;
    private readonly baseUrl = 'http://127.0.0.1:3001/api';
    private readonly wsUrl = 'ws://127.0.0.1:3001/ws';
    private windows: Set<BrowserWindow> = new Set();
    private reconnectTimer: NodeJS.Timeout | null = null;

    constructor() {
        this.registerIpcHandlers();
    }

    public addWindow(window: BrowserWindow) {
        this.windows.add(window);
        window.on('closed', () => this.windows.delete(window));
    }

    public connect() {
        if (this.ws) return;

        this.ws = new WebSocket(this.wsUrl);

        this.ws.on('open', () => {
            console.log('[MediaEngineBridge] WebSocket connected to Go engine');
            if (this.reconnectTimer) {
                clearInterval(this.reconnectTimer);
                this.reconnectTimer = null;
            }
        });

        this.ws.on('message', (data: any) => {
            try {
                const event: MediaEngineEvent = JSON.parse(data.toString());
                this.broadcastToRenderers(event);
            } catch (err) {
                console.error('[MediaEngineBridge] Error parsing event:', err);
            }
        });

        this.ws.on('close', () => {
            console.warn('[MediaEngineBridge] WebSocket closed. Retrying...');
            this.ws = null;
            if (!this.reconnectTimer) {
                this.reconnectTimer = setInterval(() => this.connect(), 2000);
            }
        });

        this.ws.on('error', (err: any) => {
            console.error('[MediaEngineBridge] WebSocket error:', err);
        });
    }

    private broadcastToRenderers(event: MediaEngineEvent) {
        for (const win of this.windows) {
            if (!win.isDestroyed()) {
                win.webContents.send('media-engine:event', event);
            }
        }
    }

    private registerIpcHandlers() {
        // Forward basic controls
        ipcMain.handle('media-engine:play', () => this.post('/mixer/play', {}));
        ipcMain.handle('media-engine:pause', () => this.post('/mixer/pause', {}));
        ipcMain.handle('media-engine:stop', () => this.post('/mixer/stop', {}));

        // Song loading
        ipcMain.handle('media-engine:load-song', (_, songId: string, tracks: any[]) =>
            this.post('/songs/create', { id: songId, tracks })
        );

        // Mixer controls
        ipcMain.handle('media-engine:set-volume', (_, trackId: string, volume: number) =>
            this.post('/mixer/volume', { trackId, volume })
        );
        ipcMain.handle('media-engine:set-pan', (_, trackId: string, pan: number) =>
            // Go expects "trackId" in JSON body even though service says "trackId"
            this.post('/mixer/pan', { trackId, pan })
        );
        ipcMain.handle('media-engine:set-mute', (_, trackId: string, muted: boolean) =>
            this.post('/mixer/mute', { trackId, muted })
        );

        // Transpose
        ipcMain.handle('media-engine:transpose', (_, songId: string, semitones: number) =>
            this.post('/songs/transpose', { songId, semitones })
        );
    }

    private async post(endpoint: string, body: any) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                throw new Error(`Go Engine Error: ${response.statusText}`);
            }
            return await response.json().catch(() => ({ success: true }));
        } catch (err) {
            console.error(`[MediaEngineBridge] POST ${endpoint} failed:`, err);
            return { success: false, error: String(err) };
        }
    }
}

export const mediaEngineBridge = new MediaEngineBridge();
