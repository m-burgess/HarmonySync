import React, { useState } from 'react';
import * as TauriDialog from '@tauri-apps/plugin-dialog';
import { 
    decodeAudioFileRust, 
    getOrDecodeAudioRust,
    getAudioCacheStatsRust,
    clearAudioCacheRust 
} from '../../utils/audio/rust-audio';
import {
    loadAudioFileBinary,
    getAudioCacheStatsBinary,
    clearAudioCacheBinary
} from '../../utils/audio/rust-audio-binary';
import { getAudioContext } from '../../utils/audio';

/**
 * Debug component to test Rust audio decoding
 */
const RustAudioDebug = () => {
    const [stats, setStats] = useState(null);
    const [lastDecoded, setLastDecoded] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [useBinary, setUseBinary] = useState(true); // Default to binary (faster)

    const handleSelectAndDecode = async () => {
        try {
            setLoading(true);
            setError(null);

            const selectedPath = await TauriDialog.open({
                filters: [{
                    name: 'Audio Files',
                    extensions: ['mp3', 'ogg', 'wav', 'flac', 'aac', 'm4a']
                }],
                multiple: false,
                title: 'Select Audio File to Test Decode'
            });

            if (selectedPath) {
                console.log('Decoding:', selectedPath);
                const startTime = performance.now();
                
                let decoded;
                if (useBinary) {
                    // Binary mode - get metadata and create AudioBuffer
                    const audioContext = getAudioContext();
                    const audioBuffer = await loadAudioFileBinary(selectedPath, audioContext);
                    decoded = {
                        path: selectedPath,
                        duration: audioBuffer.duration,
                        sample_rate: audioBuffer.sampleRate,
                        channels: audioBuffer.numberOfChannels,
                        samples: { length: audioBuffer.length * audioBuffer.numberOfChannels }
                    };
                } else {
                    // JSON mode (original, slower)
                    decoded = await getOrDecodeAudioRust(selectedPath);
                }
                
                const duration = performance.now() - startTime;

                setLastDecoded({
                    ...decoded,
                    decodeTime: duration
                });

                // Refresh stats
                await refreshStats();
            }
        } catch (err) {
            console.error('Decode error:', err);
            setError(err.toString());
        } finally {
            setLoading(false);
        }
    };

    const refreshStats = async () => {
        try {
            const cacheStats = useBinary 
                ? await getAudioCacheStatsBinary()
                : await getAudioCacheStatsRust();
            setStats(cacheStats);
        } catch (err) {
            console.error('Stats error:', err);
        }
    };

    const handleClearCache = async () => {
        try {
            if (useBinary) {
                await clearAudioCacheBinary();
            } else {
                await clearAudioCacheRust();
            }
            await refreshStats();
            alert('Cache cleared!');
        } catch (err) {
            console.error('Clear cache error:', err);
            setError(err.toString());
        }
    };

    return (
        <div className="p-4 bg-gray-800 text-white rounded-md space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Rust Audio Decoder Test</h2>
                <div className="flex items-center gap-2">
                    <span className="text-sm">Mode:</span>
                    <button
                        onClick={() => setUseBinary(!useBinary)}
                        className={`px-3 py-1 rounded text-sm font-semibold ${
                            useBinary 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : 'bg-yellow-600 hover:bg-yellow-700'
                        }`}
                    >
                        {useBinary ? '⚡ Binary (Fast)' : '📦 JSON (Slow)'}
                    </button>
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={handleSelectAndDecode}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
                >
                    {loading ? 'Decoding...' : 'Select & Decode Audio File'}
                </button>

                <button
                    onClick={refreshStats}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
                >
                    Refresh Stats
                </button>

                <button
                    onClick={handleClearCache}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                >
                    Clear Cache
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-900 border border-red-700 rounded">
                    <p className="font-bold">Error:</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {lastDecoded && (
                <div className="p-3 bg-gray-700 rounded space-y-2">
                    <h3 className="font-bold text-green-400">✓ Last Decoded File:</h3>
                    <div className="text-sm space-y-1">
                        <p><span className="font-semibold">Path:</span> {lastDecoded.path}</p>
                        <p><span className="font-semibold">Duration:</span> {lastDecoded.duration.toFixed(2)}s</p>
                        <p><span className="font-semibold">Sample Rate:</span> {lastDecoded.sample_rate}Hz</p>
                        <p><span className="font-semibold">Channels:</span> {lastDecoded.channels}</p>
                        <p><span className="font-semibold">Samples:</span> {lastDecoded.samples.length.toLocaleString()}</p>
                        <p className="text-green-400"><span className="font-semibold">Decode Time:</span> {lastDecoded.decodeTime.toFixed(2)}ms</p>
                    </div>
                </div>
            )}

            {stats && (
                <div className="p-3 bg-gray-700 rounded space-y-2">
                    <h3 className="font-bold text-blue-400">📊 Cache Statistics:</h3>
                    <div className="text-sm space-y-1">
                        <p><span className="font-semibold">Cached Files:</span> {stats.count}</p>
                        <p><span className="font-semibold">Memory Usage:</span> {stats.memory_mb.toFixed(2)} MB ({stats.memory_bytes.toLocaleString()} bytes)</p>
                    </div>
                </div>
            )}

            <div className="p-3 bg-gray-900 border border-gray-700 rounded text-xs">
                <p className="font-semibold mb-1">Instructions:</p>
                <ol className="list-decimal list-inside space-y-1">
                    <li>Click "Select & Decode Audio File" to test decoding</li>
                    <li>First decode will be slower (cache miss)</li>
                    <li>Second decode of same file will be instant (cache hit)</li>
                    <li>Check browser console for detailed logs</li>
                    <li>Monitor memory usage in cache stats</li>
                </ol>
            </div>
        </div>
    );
};

export default RustAudioDebug;
