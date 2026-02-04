describe('AudioMixer targeted branches', () => {
    beforeEach(() => { jest.resetModules(); jest.restoreAllMocks(); });

    test('prepareTrackForPlayback rejects when ffmpeg conversion fails', async () => {
        // Mock spawn to simulate ffmpeg exiting with non-zero code
        const child_process = require('child_process');
        const EventEmitter = require('events');
        jest.spyOn(child_process, 'spawn').mockImplementation(() => {
            const ee = new EventEmitter();
            // emit close with non-zero code asynchronously
            setImmediate(() => ee.emit('close', 2));
            return ee;
        });

        const AudioMixer = require('../audioMixer').default;
        const mixer = new AudioMixer(null);

        const track: any = {
            id: 't-mp3', name: 'MP3Track', filePath: '/tmp/fake.mp3', audic: null, audioProcess: null,
            tempFilePath: null, pan: 0, volume: 1, isPlaying: false, isMuted: false, duration: 1,
        };

        await expect((mixer as any).prepareTrackForPlayback(track)).rejects.toThrow(/FFmpeg/);
    });

    test('startPreparedTrack falls back to audic when ffplay not present', async () => {
        jest.resetModules();
        // Mock the audioTrack module's getAudic to provide a tiny fake Audic
        const FakeAudic = function(this: any, _file: string) {
            this.play = jest.fn();
            this.destroy = jest.fn();
            this.volume = 1;
        } as any;

        jest.doMock('../audioTrack', () => ({
            getAudic: () => FakeAudic,
            AudioTrack: class {}
        }));

        const AudioMixer = require('../audioMixer').default;
        const mixer = new AudioMixer(null);

        // Force commandExists to false so ffplay path isn't used
        jest.spyOn(mixer, 'commandExists').mockImplementation(() => false);

        const track: any = {
            id: 't-audic', name: 'AudicTrack', filePath: '/tmp/fake.wav', audic: null, audioProcess: null,
            tempFilePath: null, pan: 0, volume: 0.5, isPlaying: false, isMuted: false, duration: 0.01,
        };

        // Use fake timers to advance the internal timeout-based end
        jest.useFakeTimers();
        const playPromise = (mixer as any).startPreparedTrack(track, track.filePath);
        // advance beyond duration (0.01s -> 10ms)
        jest.advanceTimersByTime(20);
        jest.useRealTimers();

        await playPromise;
        expect(track.isPlaying).toBe(false);
    });

    test('performCrossfade returns early when activeCrossfade is cancelled', async () => {
        const AudioMixer = require('../audioMixer').default;
        const mixer = new AudioMixer(null);

        // Add dummy tracks
        const oldTrack: any = { id: 'old', name: 'Old', isPlaying: true, setVolume: jest.fn(), stop: jest.fn(), getState: () => ({}) };
        const newTrack: any = { id: 'new', name: 'New', isPlaying: true, setVolume: jest.fn(), stop: jest.fn(), getState: () => ({}) };
        mixer.tracks.set('old', oldTrack);
        mixer.tracks.set('new', newTrack);

        mixer.activeCrossfade = { startTime: Date.now(), duration: 200, oldTracks: ['old'], newTracks: ['new'], completed: false };

        const p = (mixer as any).performCrossfade();
        // Cancel shortly after it begins
        setTimeout(() => { mixer.activeCrossfade = null; }, 5);

        await expect(p).resolves.toBeUndefined();
        // old track should still exist because cancellation stops early
        expect(mixer.tracks.has('old')).toBe(true);
    });

    test('getCommandPath and commandExists handle execSync failures', () => {
        const child_process = require('child_process');
        jest.spyOn(child_process, 'execSync').mockImplementation(() => { throw new Error('no'); });

        const AudioMixer = require('../audioMixer').default;
        const mixer = new AudioMixer(null);

        expect(mixer.commandExists('nonexistent')).toBe(false);
        expect(mixer.getCommandPath('nonexistent')).toBe('nonexistent');
        // restore
        (child_process.execSync as jest.Mock).mockRestore?.();
    });

    test('ffplay playback cleans up temp file on close', async () => {
        jest.resetModules();
        const child_process = require('child_process');
        const events = require('events');
        const fs = require('fs');
        const os = require('os');
        const path = require('path');

        let spawnedProc: any = null;
        jest.spyOn(child_process, 'spawn').mockImplementation((cmd: any, args: any, opts: any) => {
            const ee = new events.EventEmitter();
            // provide kill stub
            ee.kill = jest.fn();
            spawnedProc = ee;
            return ee;
        });

        const AudioMixer = require('../audioMixer').default;
        const mixer = new AudioMixer(null);
        jest.spyOn(mixer, 'commandExists').mockImplementation(() => true);
        jest.spyOn(mixer, 'getCommandPath').mockImplementation(() => 'ffplay');

        const tmpFile = path.join(os.tmpdir(), `test-cleanup-${Date.now()}.wav`);
        fs.writeFileSync(tmpFile, 'dummy');

        const track: any = { id: 't-ff', name: 'FF', filePath: tmpFile, audic: null, audioProcess: null,
            tempFilePath: tmpFile, pan: 0, volume: 1, isPlaying: false, isMuted: false, duration: 0.1 };

        const playPromise = (mixer as any).startPreparedTrack(track, tmpFile);
        // ensure spawn was called and we have the fake process
        expect(spawnedProc).not.toBeNull();

        // simulate process close
        spawnedProc.emit('close', 0);

        // wait a tick
        await new Promise(resolve => setImmediate(resolve));

        // ensure the playback promise settles
        await playPromise;

        expect(track.isPlaying).toBe(false);
        expect(fs.existsSync(tmpFile)).toBe(false);
    });

});
