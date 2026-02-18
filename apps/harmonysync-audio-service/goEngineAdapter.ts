import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

export class GoEngineAdapter {
    private process: ChildProcess | null = null;
    private buffer: string = '';

    constructor() {
        this.start();
    }

    private start() {
        if (this.process) return;

        // Path to audio-engine.exe
        // Assumes running from dist/ (so go up one level) or root
        const rootDir = process.cwd(); // Safe bet?
        const exePath = path.join(rootDir, 'go-engine', 'audio-engine.exe');

        console.log(`🚀 Starting Go Audio Engine from ${exePath}...`);

        if (fs.existsSync(exePath)) {
            console.log(`Found compiled engine at ${exePath}`);
            this.process = spawn(exePath);
        } else {
            console.error(`❌ Compiled engine not found at ${exePath}`);
            // Fallback to go run if needed, but we prefer exe
            const scriptPath = path.join(rootDir, 'go-engine');
            console.log(`Falling back to 'go run .' in ${scriptPath}`);
            this.process = spawn('go', ['run', '.'], { cwd: scriptPath, shell: true });
        }

        if (this.process) {
            this.process.stdout?.on('data', (dataBuffer) => {
                const data = dataBuffer.toString();
                // console.log(`[GoEngine RAW] ${data}`); // Debug raw output
                this.buffer += data;

                const lines = this.buffer.split('\n');
                this.buffer = lines.pop() || ''; // Keep incomplete line

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const msg = JSON.parse(line);
                        if (msg.level === 'error') {
                            console.error(`[GoEngine] ❌ ${msg.message}`);
                        } else {
                            console.log(`[GoEngine] ${msg.message}`);
                        }
                    } catch (e) {
                        // Non-JSON output (maybe panic or fmt.Printf)
                        console.log(`[GoEngine] ${line}`);
                    }
                }
            });

            this.process.stderr?.on('data', (data) => {
                console.error(`[GoEngine] stderr: ${data}`);
            });

            this.process.on('close', (code) => {
                console.log(`[GoEngine] Process exited with code ${code}`);
                this.process = null;
                // Optional: restart logic
            });
        }
    }

    private sendCommand(op: string, args: any) {
        if (!this.process) {
            console.warn('Go Engine not running, attempting to restart...');
            this.start();
            if (!this.process) return;
        }
        const payload = JSON.stringify({ op, args }) + '\n';
        this.process.stdin?.write(payload);
    }

    public loadTrack(id: string, path: string) {
        this.sendCommand('load', { id, path });
    }

    public play() {
        this.sendCommand('play', {});
    }

    public stop() {
        this.sendCommand('stop', {});
    }

    public pause() {
        this.sendCommand('pause', {});
    }

    public setTrackVolume(id: string, volume: number) {
        this.sendCommand('setVolume', { id, volume });
    }

    public setTrackPan(id: string, pan: number) {
        this.sendCommand('setPan', { id, pan });
    }

    public setTrackMute(id: string, muted: boolean) {
        this.sendCommand('setMute', { id, muted });
    }

    // Multi-song preloading methods
    public loadSongTrack(songId: string, trackId: string, path: string) {
        this.sendCommand('loadSongTrack', { songId, trackId, path });
    }

    public activateSong(songId: string) {
        this.sendCommand('activateSong', { songId });
    }

    public clearSong(songId: string) {
        this.sendCommand('clearSong', { songId });
    }

    public clearAllTracks() {
        this.sendCommand('clear', {});
    }
}

export const audioEngine = new GoEngineAdapter();
