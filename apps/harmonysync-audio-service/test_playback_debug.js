const io = require('socket.io-client');
const socket = io('http://localhost:3001');

const TEST_FILE = "C:\\Users\\Admin\\Desktop\\Order of Service\\Service Order 1-1-2026\\05 My Jesus-My Jesus-F#-76.00bpm\\AG 1.wav";

console.log('Connecting to Audio Service...');

socket.on('connect', () => {
    console.log('Connected');

    // Load track
    console.log(`Loading track: ${TEST_FILE}`);
    socket.emit('load_track', {
        filePath: TEST_FILE,
        name: 'Debug Track'
    });
});

socket.on('track_loaded', (data) => {
    console.log('Track loaded:', data);

    // Wait a bit then play
    setTimeout(() => {
        console.log('Sending play_track...');
        // Try play_track with ID
        socket.emit('play_track', { id: data.trackId });

        // Also try REST play-all just in case
        fetch('http://localhost:3001/api/mixer/play-all', { method: 'POST' })
            .then(() => console.log('Called play-all via REST'))
            .catch(err => console.error('REST failed:', err));

        // Let it play for 3 seconds
        setTimeout(() => {
            console.log('Stopping...');
            socket.emit('stop_track', { id: data.trackId });
            socket.close();
            process.exit(0);
        }, 3000);
    }, 1000);
});

socket.on('error', (err) => {
    console.error('Socket error:', err);
    process.exit(1);
});

// Keep alive
setTimeout(() => {
    console.log('Timeout waiting for load');
    process.exit(1);
}, 10000);
