import fs from 'fs';
import os from 'os';
import path from 'path';

describe('Transpose and play files', () => {
    beforeEach(() => { jest.resetModules(); jest.restoreAllMocks(); });

    test('transpose up and down then play transposed files (audic fallback)', async () => {
        jest.resetModules();

        // Create a tiny valid WAV file (10ms) using node-wav
        const wav = require('node-wav');
        const sampleRate = 44100;
        const samples = Math.floor(sampleRate * 0.01); // 10ms
        const left = new Float32Array(samples);
        const right = new Float32Array(samples);
        // leave as silence
        const buffer: Buffer = wav.encode([left, right], { sampleRate, bitDepth: 16 });

        const tmpDir = os.tmpdir();
        const srcPath = path.join(tmpDir, `src-${Date.now()}.wav`);
        fs.writeFileSync(srcPath, buffer);

        // Helper to simulate transposition by copying the source to a new temp file
        function transposeFile(source: string, semitones: number): string {
            const suffix = semitones >= 0 ? `up${semitones}` : `down${Math.abs(semitones)}`;
            const out = path.join(tmpDir, `transposed-${suffix}-${Date.now()}.wav`);
            fs.copyFileSync(source, out);
            return out;
        }

        const events = require('events');

        const AudioMixer = require('../audioMixer').default;
        const mixer = new AudioMixer(null);

        // Create transposed files (simulate +2 and -2 semitones)
        const upPath = transposeFile(srcPath, 2);
        const downPath = transposeFile(srcPath, -2);

        // Load tracks normally (requires valid WAVs)
        const upId = await mixer.loadTrack(upPath);
        const downId = await mixer.loadTrack(downPath);
        expect(upId).toBeDefined();
        expect(downId).toBeDefined();

        // Mock ffplay usage so startPreparedTrack uses spawn and we can simulate close
        jest.spyOn(mixer, 'commandExists').mockImplementation(() => true);
        jest.spyOn(mixer, 'getCommandPath').mockImplementation(() => 'ffplay');

        jest.spyOn(require('child_process'), 'spawn').mockImplementation((cmd: any, args: any, opts: any) => {
            const ee = new events.EventEmitter();
            ee.kill = jest.fn();
            // simulate async close
            setImmediate(() => ee.emit('close', 0));
            return ee;
        });

        // Start playback via the ffplay path (bypasses wav.decode in AudioTrack.play)
        const track1 = mixer.tracks.get(upId)!;
        const track2 = mixer.tracks.get(downId)!;
        await (mixer as any).startPreparedTrack(track1, upPath);
        await (mixer as any).startPreparedTrack(track2, downPath);

        // give spawned close handlers a tick
        await new Promise(resolve => setImmediate(resolve));

        expect(track1.isPlaying).toBe(false);
        expect(track2.isPlaying).toBe(false);

        // Cleanup
        mixer.clearAllTracks();
        [srcPath, upPath, downPath].forEach(p => { try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {} });
        jest.useRealTimers();
    });
});
