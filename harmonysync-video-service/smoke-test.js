const http = require('http');

// Simple smoke test for the video service
async function testHealth() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:3002/api/health', (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const health = JSON.parse(data);
                    console.log('✅ Health check passed:', health);
                    resolve(health);
                } else {
                    reject(new Error(`Health check failed: ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', (err) => {
            reject(new Error(`Connection failed: ${err.message}`));
        });
        
        req.end();
    });
}

async function testShutdown() {
    return new Promise((resolve, reject) => {
        const shutdownToken = process.env.SHUTDOWN_TOKEN;
        if (!shutdownToken) {
            console.log('⚠️  No SHUTDOWN_TOKEN set, skipping shutdown test');
            resolve();
            return;
        }

        const postData = JSON.stringify({});
        const options = {
            hostname: '127.0.0.1',
            port: 3002,
            path: '/api/shutdown',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-shutdown-token': shutdownToken
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ Shutdown successful');
                    resolve();
                } else {
                    reject(new Error(`Shutdown failed: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(new Error(`Shutdown request failed: ${err.message}`));
        });

        req.write(postData);
        req.end();
    });
}

async function runTests() {
    try {
        console.log('🧪 Running smoke tests...\n');
        
        await testHealth();
        
        // Wait a bit before shutdown
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testShutdown();
        
        console.log('\n✅ All tests passed!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

runTests();
