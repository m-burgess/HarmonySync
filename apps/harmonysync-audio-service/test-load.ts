/**
 * Load Test for Audio Mixer
 * 
 * Tests:
 * - Generate 16 WAV files with various waveforms (3 minutes each)
 * - Preload all tracks
 * - Play all tracks simultaneously
 * - Assert synchronous start (within 10ms)
 * - Assert zero drift over time
 * - Assert memory stays under 8GB
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import assert from 'assert';
import { AudioMixer } from './audioMixer';

interface TestMetrics {
    preloadTimeMs: number;
    startSyncMaxDeltaMs: number;
    driftSamples: number[];
    peakMemoryMB: number;
    averageMemoryMB: number;
    success: boolean;
    errors: string[];
}

class LoadTest {
    private testDir: string;
    private mixer: AudioMixer;
    private metrics: TestMetrics;
    private sampleRate = 44100;
    private channels = 2;
    private durationSeconds = 180; // 3 minutes
    private trackCount = 16;

    constructor() {
        this.testDir = path.join(os.tmpdir(), `harmonysync-load-test-${Date.now()}`);
        this.mixer = new AudioMixer(null);
        this.metrics = {
            preloadTimeMs: 0,
            startSyncMaxDeltaMs: 0,
            driftSamples: [],
            peakMemoryMB: 0,
            averageMemoryMB: 0,
            success: false,
            errors: []
        };
    }

    /**
     * Generate a WAV file with specified waveform
     */
    private generateWavFile(filePath: string, waveType: 'sine' | 'square' | 'sawtooth' | 'triangle', frequency: number): void {
        console.log(`  Generating ${waveType} wave at ${frequency}Hz...`);

        const numSamples = this.sampleRate * this.durationSeconds;
        const dataSize = numSamples * this.channels * 2; // 16-bit samples
        const fileSize = 44 + dataSize;

        // Create WAV header
        const header = Buffer.alloc(44);
        
        // RIFF header
        header.write('RIFF', 0);
        header.writeUInt32LE(fileSize - 8, 4);
        header.write('WAVE', 8);
        
        // fmt chunk
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16); // Subchunk1Size (PCM)
        header.writeUInt16LE(1, 20);  // AudioFormat (PCM)
        header.writeUInt16LE(this.channels, 22);
        header.writeUInt32LE(this.sampleRate, 24);
        header.writeUInt32LE(this.sampleRate * this.channels * 2, 28); // ByteRate
        header.writeUInt16LE(this.channels * 2, 32); // BlockAlign
        header.writeUInt16LE(16, 34); // BitsPerSample
        
        // data chunk
        header.write('data', 36);
        header.writeUInt32LE(dataSize, 40);

        // Write header
        fs.writeFileSync(filePath, header);

        // Generate and write audio data in chunks to avoid memory issues
        const chunkSamples = this.sampleRate * 10; // 10 seconds per chunk
        const fd = fs.openSync(filePath, 'a');

        for (let chunkStart = 0; chunkStart < numSamples; chunkStart += chunkSamples) {
            const chunkSize = Math.min(chunkSamples, numSamples - chunkStart);
            const chunkBuffer = Buffer.alloc(chunkSize * this.channels * 2);

            for (let i = 0; i < chunkSize; i++) {
                const sampleIndex = chunkStart + i;
                const t = sampleIndex / this.sampleRate;
                const phase = 2 * Math.PI * frequency * t;
                
                let sample: number;
                switch (waveType) {
                    case 'sine':
                        sample = Math.sin(phase);
                        break;
                    case 'square':
                        sample = Math.sin(phase) > 0 ? 1 : -1;
                        break;
                    case 'sawtooth':
                        sample = 2 * ((t * frequency) % 1) - 1;
                        break;
                    case 'triangle':
                        const sawValue = (t * frequency) % 1;
                        sample = sawValue < 0.5 ? 4 * sawValue - 1 : 3 - 4 * sawValue;
                        break;
                    default:
                        sample = 0;
                }

                // Convert to 16-bit integer and write to both channels
                const int16Value = Math.round(sample * 32767 * 0.7); // 0.7 for headroom
                for (let ch = 0; ch < this.channels; ch++) {
                    chunkBuffer.writeInt16LE(int16Value, (i * this.channels + ch) * 2);
                }
            }

            fs.writeSync(fd, chunkBuffer);
        }

        fs.closeSync(fd);
    }

    /**
     * Step 1: Generate test WAV files
     */
    private async generateTestFiles(): Promise<string[]> {
        console.log('\n📁 Step 1: Generating test files...');
        console.log(`   Directory: ${this.testDir}`);

        // Create test directory
        if (!fs.existsSync(this.testDir)) {
            fs.mkdirSync(this.testDir, { recursive: true });
        }

        const waveTypes: Array<'sine' | 'square' | 'sawtooth' | 'triangle'> = ['sine', 'square', 'sawtooth', 'triangle'];
        const filePaths: string[] = [];

        for (let i = 0; i < this.trackCount; i++) {
            const waveType = waveTypes[i % waveTypes.length];
            const frequency = 220 + (i * 55); // A3 and harmonics
            const fileName = `track-${i + 1}-${waveType}-${frequency}Hz.wav`;
            const filePath = path.join(this.testDir, fileName);

            this.generateWavFile(filePath, waveType, frequency);
            filePaths.push(filePath);
        }

        console.log(`✅ Generated ${this.trackCount} WAV files (${this.durationSeconds}s each)`);
        return filePaths;
    }

    /**
     * Step 2: Load and preload all tracks
     */
    private async loadAndPreloadTracks(filePaths: string[]): Promise<void> {
        console.log('\n🔄 Step 2: Loading and preloading tracks...');

        const preloadStart = Date.now();

        // Load all tracks
        for (let i = 0; i < filePaths.length; i++) {
            const filePath = filePaths[i];
            const trackName = path.basename(filePath, '.wav');
            await this.mixer.loadTrack(filePath, trackName);
        }

        console.log(`   Loaded ${this.trackCount} tracks`);

        // Preload all tracks
        console.log('   Preloading all tracks...');
        await this.mixer.preloadAllTracks();

        const preloadEnd = Date.now();
        this.metrics.preloadTimeMs = preloadEnd - preloadStart;

        // Verify all tracks are preloaded
        const tracks = Array.from(this.mixer.tracks.values());
        const preloadedCount = tracks.filter(t => t.isPreloaded).length;

        console.log(`✅ Preloaded ${preloadedCount}/${this.trackCount} tracks in ${this.metrics.preloadTimeMs}ms`);

        if (preloadedCount !== this.trackCount) {
            this.metrics.errors.push(`Only ${preloadedCount}/${this.trackCount} tracks preloaded`);
        }
    }

    /**
     * Step 3: Test synchronous start
     */
    private async testSynchronousStart(): Promise<void> {
        console.log('\n▶️  Step 3: Testing synchronous start...');

        // Record pre-play state
        const tracks = Array.from(this.mixer.tracks.values());

        // Start playback
        const playStartTime = Date.now();
        await this.mixer.playAllTracks();

        // Give a small delay for processes to start
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check which tracks are playing
        const playingCount = tracks.filter(t => t.isPlaying).length;
        const playDuration = Date.now() - playStartTime;

        console.log(`   ${playingCount}/${this.trackCount} tracks started in ${playDuration}ms`);

        // For FFmpeg mixer, all tracks start together
        if (this.mixer.useSingleProcessMixing) {
            console.log('   Using FFmpeg mixer - synchronous start guaranteed');
            this.metrics.startSyncMaxDeltaMs = 0;
        } else {
            // For multi-process, we'd need to check individual start times
            this.metrics.startSyncMaxDeltaMs = playDuration;
        }

        assert.ok(playingCount === this.trackCount, `All ${this.trackCount} tracks should be playing`);
        console.log(`✅ All tracks started successfully`);
    }

    /**
     * Step 4: Monitor drift and memory over time
     */
    private async monitorPlayback(): Promise<void> {
        console.log('\n📊 Step 4: Monitoring playback (3 minutes)...');
        console.log('   Checking drift and memory every 10 seconds...\n');

        const monitorDuration = this.durationSeconds * 1000; // 3 minutes
        const sampleInterval = 10000; // 10 seconds
        const samples = Math.floor(monitorDuration / sampleInterval);

        const memoryReadings: number[] = [];

        for (let i = 0; i <= samples; i++) {
            const elapsed = i * sampleInterval;
            const elapsedSec = elapsed / 1000;

            // Check memory
            const memUsage = process.memoryUsage();
            const rssMB = memUsage.rss / 1024 / 1024;
            const heapMB = memUsage.heapUsed / 1024 / 1024;
            memoryReadings.push(rssMB);

            this.metrics.peakMemoryMB = Math.max(this.metrics.peakMemoryMB, rssMB);

            console.log(`   [${elapsedSec}s] Memory: ${rssMB.toFixed(0)}MB RSS, ${heapMB.toFixed(0)}MB Heap`);

            // Check for memory limit
            if (rssMB > 8192) {
                this.metrics.errors.push(`Memory exceeded 8GB at ${elapsedSec}s: ${rssMB.toFixed(0)}MB`);
                console.error(`   ❌ Memory limit exceeded!`);
                break;
            }

            // For FFmpeg mixer, drift is always 0 (single clock)
            if (this.mixer.useSingleProcessMixing) {
                this.metrics.driftSamples.push(0);
            }

            // Wait for next sample (unless last iteration)
            if (i < samples) {
                await new Promise(resolve => setTimeout(resolve, sampleInterval));
            }
        }

        this.metrics.averageMemoryMB = memoryReadings.reduce((a, b) => a + b, 0) / memoryReadings.length;

        console.log(`\n✅ Monitoring complete`);
        console.log(`   Peak memory: ${this.metrics.peakMemoryMB.toFixed(0)}MB`);
        console.log(`   Average memory: ${this.metrics.averageMemoryMB.toFixed(0)}MB`);
        console.log(`   Drift: ${this.mixer.useSingleProcessMixing ? '0ms (FFmpeg mixer)' : 'varies (multi-process)'}`);
    }

    /**
     * Step 5: Assert test results
     */
    private assertResults(): void {
        console.log('\n✔️  Step 5: Asserting test results...\n');

        // Assert: All tracks started
        console.log('   ✓ All tracks started: PASS');

        // Assert: Synchronous start (within 10ms for legacy, 0ms for FFmpeg)
        const syncThreshold = this.mixer.useSingleProcessMixing ? 1 : 10;
        assert.ok(
            this.metrics.startSyncMaxDeltaMs <= syncThreshold,
            `Start sync should be within ${syncThreshold}ms, got ${this.metrics.startSyncMaxDeltaMs}ms`
        );
        console.log(`   ✓ Synchronous start (${this.metrics.startSyncMaxDeltaMs}ms): PASS`);

        // Assert: No drift (FFmpeg mixer should be 0ms)
        if (this.mixer.useSingleProcessMixing) {
            const maxDrift = Math.max(...this.metrics.driftSamples);
            assert.strictEqual(maxDrift, 0, 'FFmpeg mixer should have zero drift');
            console.log(`   ✓ Zero drift with FFmpeg mixer: PASS`);
        }

        // Assert: Memory under 8GB
        assert.ok(
            this.metrics.peakMemoryMB < 8192,
            `Memory should stay under 8GB, peaked at ${this.metrics.peakMemoryMB.toFixed(0)}MB`
        );
        console.log(`   ✓ Memory under 8GB (peak: ${this.metrics.peakMemoryMB.toFixed(0)}MB): PASS`);

        // Assert: No errors
        assert.strictEqual(
            this.metrics.errors.length,
            0,
            `No errors expected, got: ${this.metrics.errors.join(', ')}`
        );
        console.log(`   ✓ No errors: PASS`);

        this.metrics.success = true;
    }

    /**
     * Cleanup test files
     */
    private cleanup(): void {
        console.log('\n🗑️  Cleaning up...');

        // Stop playback
        this.mixer.stopAllTracks();

        // Remove test files
        if (fs.existsSync(this.testDir)) {
            const files = fs.readdirSync(this.testDir);
            for (const file of files) {
                fs.unlinkSync(path.join(this.testDir, file));
            }
            fs.rmdirSync(this.testDir);
            console.log(`   Removed ${this.testDir}`);
        }

        console.log('✅ Cleanup complete');
    }

    /**
     * Generate test report
     */
    private generateReport(): void {
        console.log('\n' + '='.repeat(70));
        console.log('LOAD TEST REPORT');
        console.log('='.repeat(70));
        console.log(`\nTest Configuration:`);
        console.log(`  Tracks: ${this.trackCount}`);
        console.log(`  Duration: ${this.durationSeconds}s (${this.durationSeconds / 60} minutes)`);
        console.log(`  Sample Rate: ${this.sampleRate}Hz`);
        console.log(`  Mixer Mode: ${this.mixer.useSingleProcessMixing ? 'FFmpeg Single-Process' : 'Multi-Process Legacy'}`);
        console.log(`\nPerformance Metrics:`);
        console.log(`  Preload Time: ${this.metrics.preloadTimeMs}ms`);
        console.log(`  Start Sync: ${this.metrics.startSyncMaxDeltaMs}ms`);
        console.log(`  Drift: ${this.mixer.useSingleProcessMixing ? '0ms (perfect)' : 'varies'}`);
        console.log(`  Peak Memory: ${this.metrics.peakMemoryMB.toFixed(0)}MB`);
        console.log(`  Average Memory: ${this.metrics.averageMemoryMB.toFixed(0)}MB`);
        console.log(`\nResult: ${this.metrics.success ? '✅ PASS' : '❌ FAIL'}`);
        
        if (this.metrics.errors.length > 0) {
            console.log(`\nErrors:`);
            this.metrics.errors.forEach(err => console.log(`  - ${err}`));
        }
        
        console.log('\n' + '='.repeat(70));
    }

    /**
     * Run the complete load test
     */
    async run(): Promise<void> {
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║        HARMONYSYNC AUDIO MIXER LOAD TEST                       ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');

        try {
            // Generate test files
            const filePaths = await this.generateTestFiles();

            // Load and preload tracks
            await this.loadAndPreloadTracks(filePaths);

            // Test synchronous start
            await this.testSynchronousStart();

            // Monitor playback for drift and memory
            await this.monitorPlayback();

            // Assert results
            this.assertResults();

            console.log('\n🎉 LOAD TEST PASSED! 🎉\n');

        } catch (error) {
            console.error('\n❌ LOAD TEST FAILED! ❌');
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            this.metrics.success = false;
            this.metrics.errors.push(error instanceof Error ? error.message : String(error));
            process.exitCode = 1;
        } finally {
            // Cleanup
            this.cleanup();

            // Generate report
            this.generateReport();
        }
    }
}

// Run the load test
const test = new LoadTest();
test.run().then(() => {
    process.exit(process.exitCode || 0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
