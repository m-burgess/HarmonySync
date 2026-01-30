#!/usr/bin/env node

// Simple smoke test: GET /api/health then POST /api/shutdown (with token if provided)
import axios, { AxiosResponse } from 'axios';

const HOST: string = process.env.HOST || '127.0.0.1';
const PORT: string = process.env.PORT || '3001';
const SERVICE_URL: string = process.env.SERVICE_URL || `http://${HOST}:${PORT}`;
const SHUTDOWN_TOKEN: string | null = process.env.SHUTDOWN_TOKEN || null;

interface HealthResponse {
    status?: string;
}

interface ShutdownResponse {
    status?: string;
    message?: string;
}

async function wait(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
}

async function main(): Promise<void> {
    console.log(`🔍 Smoke test targeting ${SERVICE_URL}`);

    try {
        const health: AxiosResponse<HealthResponse> = await axios.get(`${SERVICE_URL}/api/health`, { timeout: 3000 });
        console.log('✅ Health check succeeded:', health.data.status || 'ok');
    } catch (err: any) {
        console.error('❌ Health check failed:', err.message);
        process.exit(1);
    }

    try {
        const headers: Record<string, string> = {};
        if (SHUTDOWN_TOKEN) {
            headers['x-shutdown-token'] = SHUTDOWN_TOKEN;
        }

        console.log('🛑 Sending shutdown request...');
        const resp: AxiosResponse<ShutdownResponse> = await axios.post(
            `${SERVICE_URL}/api/shutdown`,
            {},
            { headers, timeout: 5000 }
        );
        console.log('✅ Shutdown request accepted:', resp.data.status || resp.data.message || 'ok');
    } catch (err: any) {
        console.error('❌ Shutdown request failed:', err.response ? err.response.statusText : err.message);
        process.exit(1);
    }

    // Wait a bit and probe health until it goes down
    console.log('⏳ Waiting for service to stop...');
    const maxRetries: number = 10;
    for (let i = 0; i < maxRetries; i++) {
        await wait(500);
        try {
            await axios.get(`${SERVICE_URL}/api/health`, { timeout: 2000 });
            console.log('ℹ️ Service still responding...');
        } catch (err: any) {
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
