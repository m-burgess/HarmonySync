const io = require('socket.io-client');

const socket = io('http://localhost:3001');

socket.on('connect', () => {
    console.log('Connected to Audio Service');

    // Test loading a track
    // We need a valid file path. I'll use a dummy one or try to find one.
    // For now, let's just see if the server accepts the command and tries to load it in Go.

    console.log('Sending load_track command...');
    socket.emit('load_track', {
        filePath: 'C:\\Windows\\Media\\chimes.wav',
        name: 'Test Chimes'
    });
});

socket.on('track_loaded', (data) => {
    console.log('Track loaded:', data);

    // Play it
    console.log('Sending play_track command...');
    socket.emit('play_track', { trackId: data.trackId });

    setTimeout(() => {
        console.log('Sending stop_track command...');
        socket.emit('stop_track', { trackId: data.trackId });

        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }, 2000);
});

socket.on('error', (data) => {
    console.error('Error:', data);
});

socket.on('mixer_state_changed', (state) => {
    // console.log('Mixer state update:', state);
});
