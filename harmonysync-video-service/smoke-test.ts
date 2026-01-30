import http from 'http';

interface HealthResponse {
    status: string;
    service: string;
    version: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    activeJobs: number;
}

// Simple smoke test for the video service
async function testHealth(): Promise<HealthResponse> {
    return new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:3002/api/health', (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const health: HealthResponse = JSON.parse(data);
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

async function testShutdown(): Promise<void> {
    return new Promise((resolve, reject) => {
        const shutdownToken = process.env.SHUTDOWN_TOKEN;
        if (!shutdownToken) {
            console.log('⚠️  No SHUTDOWN_TOKEN set, skipping shutdown test');
            resolve();
            return;
        }

        const postData = JSON.stringify({});
        const options: http.RequestOptions = {
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

async function runTests(): Promise<void> {
    try {
        console.log('🧪 Running smoke tests...\n');
        
        await testHealth();
        
        // Wait a bit before shutdown
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testShutdown();
        
        console.log('\n✅ All tests passed!');
        process.exit(0);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('\n❌ Test failed:', errorMessage);
        process.exit(1);
    }
}

runTests();
