try {
    const { AudioEngine } = require('./build/Release/harmonysync_audio_native');
    console.log('Module loaded successfully');
    const engine = new AudioEngine();
    console.log('AudioEngine instantiated');
    console.log('Init result:', engine.loadTrack ? 'Methods present' : 'Methods missing');
} catch (error) {
    console.error('Failed to load module:', error);
    process.exit(1);
}
