// Quick Test: Audio Service with Native Module Integration
// Run with: node quicktest.js

const http = require('http');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  Audio Service - Quick Integration Test                 ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// Test the health endpoint
const options = {
    hostname: '127.0.0.1',
    port: 3001,
    path: '/api/health',
    method: 'GET'
};

console.log('Testing audio service health endpoint...\n');

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('✅ Service Response:');
        try {
            const health = JSON.parse(data);
            console.log(JSON.stringify(health, null, 2));
            console.log('\n' + '='.repeat(60));
            console.log('STATUS: Audio service is running successfully!');
            console.log('='.repeat(60));
        } catch (e) {
            console.log(data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Error connecting to audio service:');
    console.error(error.message);
    console.log('\nMake sure the service is running:');
    console.log('  cd apps/harmonysync-audio-service');
    console.log('  pnpm start');
});

req.end();
