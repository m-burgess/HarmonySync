#!/usr/bin/env node

// Simple smoke test: GET /api/health then POST /api/shutdown (with token if provided)
const axios = require('axios');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || '3001';
const SERVICE_URL = process.env.SERVICE_URL || `http://${HOST}:${PORT}`;
const SHUTDOWN_TOKEN = process.env.SHUTDOWN_TOKEN || null;

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    console.log(`🔍 Smoke test targeting ${SERVICE_URL}`);

    try {
        const health = await axios.get(`${SERVICE_URL}/api/health`, { timeout: 3000 });
        console.log('✅ Health check succeeded:', health.data.status || 'ok');
    } catch (err) {
        console.error('❌ Health check failed:', err.message);
        process.exit(1);
    }

    try {
        const headers = {};
        if (SHUTDOWN_TOKEN) {
            headers['x-shutdown-token'] = SHUTDOWN_TOKEN;
        }

        console.log('🛑 Sending shutdown request...');
        const resp = await axios.post(`${SERVICE_URL}/api/shutdown`, {}, { headers, timeout: 5000 });
        console.log('✅ Shutdown request accepted:', resp.data.status || resp.data.message || 'ok');
    } catch (err) {
        console.error('❌ Shutdown request failed:', err.response ? err.response.statusText : err.message);
        process.exit(1);
    }

    // Wait a bit and probe health until it goes down
    console.log('⏳ Waiting for service to stop...');
    const maxRetries = 10;
    for (let i = 0; i < maxRetries; i++) {
        await wait(500);
        try {
            await axios.get(`${SERVICE_URL}/api/health`, { timeout: 2000 });
            console.log('ℹ️ Service still responding...');
        } catch (err) {
            console.log('✅ Service appears to be down (health check failed)');
            process.exit(0);
        }
    }

    console.error('⚠️ Service did not stop within expected time');
    process.exit(1);
}

if (require.main === module) {
    main();
}
