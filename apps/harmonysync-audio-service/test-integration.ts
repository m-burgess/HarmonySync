#!/usr/bin/env node

// Simple test script to verify Node.js audio service functionality
import axios, { AxiosResponse } from 'axios';
import { io as socketIOClient, Socket } from 'socket.io-client';

const SERVICE_URL: string = 'http://localhost:3001';

interface HealthData {
    memoryUsage: {
        rss: number;
    };
}

interface MixerState {
    tracks: any[];
    masterVolume: number;
    memoryUsage: {
        rss: number;
    };
}

interface MixerStateChangedEvent {
    tracks: any[];
    memoryUsage: {
        rss: number;
    };
}

class AudioServiceTester {
    private socket: Socket | null;

    constructor() {
        this.socket = null;
    }

    async testRestAPI(): Promise<boolean> {
        console.log('🔍 Testing REST API endpoints...\n');

        try {
            // Test health endpoint
            console.log('1. Testing health endpoint...');
            const health: AxiosResponse<HealthData> = await axios.get(`${SERVICE_URL}/api/health`);
            console.log('✅ Health check passed');
            console.log(`   Memory usage: ${(health.data.memoryUsage.rss / 1024 / 1024).toFixed(1)}MB\n`);

            // Test mixer state
            console.log('2. Testing mixer state...');
            const state: AxiosResponse<MixerState> = await axios.get(`${SERVICE_URL}/api/mixer/state`);
            console.log('✅ Mixer state retrieved');
            console.log(`   Tracks: ${state.data.tracks.length}`);
            console.log(`   Master volume: ${state.data.masterVolume}`);
            console.log(`   Memory: ${(state.data.memoryUsage.rss / 1024 / 1024).toFixed(1)}MB\n`);

            // Test master volume control
            console.log('3. Testing master volume control...');
            await axios.post(`${SERVICE_URL}/api/mixer/master-volume`, { volume: 0.8 });
            const newState: AxiosResponse<MixerState> = await axios.get(`${SERVICE_URL}/api/mixer/state`);
            console.log('✅ Master volume updated');
            console.log(`   New master volume: ${newState.data.masterVolume}\n`);

            // Reset master volume
            await axios.post(`${SERVICE_URL}/api/mixer/master-volume`, { volume: 1.0 });

            return true;
        } catch (error: any) {
            console.error('❌ REST API test failed:', error.message);
            return false;
        }
    }

    async testWebSocket(): Promise<boolean> {
        console.log('🔌 Testing WebSocket connection...\n');

        return new Promise((resolve) => {
            try {
                this.socket = socketIOClient(SERVICE_URL, {
                    transports: ['websocket', 'polling'],
                    timeout: 5000
                });

                this.socket.on('connect', () => {
                    console.log('✅ WebSocket connected successfully');
                    console.log(`   Socket ID: ${this.socket?.id}\n`);
                });

                this.socket.on('mixer_state_changed', (state: MixerStateChangedEvent) => {
                    console.log('✅ Received mixer state update via WebSocket');
                    console.log(`   Tracks: ${state.tracks.length}`);
                    console.log(`   Memory: ${(state.memoryUsage.rss / 1024 / 1024).toFixed(1)}MB\n`);
                    
                    // Disconnect after receiving state
                    this.socket?.disconnect();
                    resolve(true);
                });

                this.socket.on('connect_error', (error: Error) => {
                    console.error('❌ WebSocket connection failed:', error.message);
                    resolve(false);
                });

                // Request initial state
                setTimeout(() => {
                    if (this.socket?.connected) {
                        // The server automatically sends state on connection
                        console.log('📡 Waiting for initial state...');
                    }
                }, 1000);

            } catch (error: any) {
                console.error('❌ WebSocket test failed:', error.message);
                resolve(false);
            }
        });
    }

    async testMemoryEfficiency(): Promise<boolean> {
        console.log('📊 Testing memory efficiency...\n');

        try {
            const initialState: AxiosResponse<MixerState> = await axios.get(`${SERVICE_URL}/api/mixer/state`);
            const initialMemory: number = initialState.data.memoryUsage.rss / 1024 / 1024;
            
            console.log(`Initial memory usage: ${initialMemory.toFixed(1)}MB`);

            // Simulate some operations to see memory behavior
            console.log('Performing multiple operations...');
            
            for (let i = 0; i < 10; i++) {
                await axios.post(`${SERVICE_URL}/api/mixer/master-volume`, { 
                    volume: Math.random() 
                });
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const finalState: AxiosResponse<MixerState> = await axios.get(`${SERVICE_URL}/api/mixer/state`);
            const finalMemory: number = finalState.data.memoryUsage.rss / 1024 / 1024;
            
            console.log(`Final memory usage: ${finalMemory.toFixed(1)}MB`);
            console.log(`Memory change: ${(finalMemory - initialMemory).toFixed(1)}MB`);
            
            if (finalMemory < 200) { // Less than 200MB is excellent
                console.log('✅ Memory usage is excellent (< 200MB)');
            } else if (finalMemory < 500) { // Less than 500MB is good
                console.log('✅ Memory usage is good (< 500MB)');
            } else {
                console.log('⚠️  Memory usage is higher than expected');
            }

            return true;
        } catch (error: any) {
            console.error('❌ Memory test failed:', error.message);
            return false;
        }
    }

    async runAllTests(): Promise<boolean> {
        console.log('🧪 HarmonySync Audio Service Integration Test\n');
        console.log('='.repeat(50) + '\n');

        const results: boolean[] = [];

        // Test REST API
        results.push(await this.testRestAPI());

        // Test WebSocket
        results.push(await this.testWebSocket());

        // Test memory efficiency
        results.push(await this.testMemoryEfficiency());

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📋 Test Summary:');
        console.log(`✅ REST API: ${results[0] ? 'PASSED' : 'FAILED'}`);
        console.log(`✅ WebSocket: ${results[1] ? 'PASSED' : 'FAILED'}`);
        console.log(`✅ Memory Efficiency: ${results[2] ? 'PASSED' : 'FAILED'}`);
        
        const passedTests: number = results.filter(r => r).length;
        console.log(`\n🎯 Overall: ${passedTests}/3 tests passed`);
        
        if (passedTests === 3) {
            console.log('🎉 All tests passed! The audio service is ready for integration.');
        } else {
            console.log('⚠️  Some tests failed. Check the logs above for details.');
        }

        return passedTests === 3;
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    const tester: AudioServiceTester = new AudioServiceTester();
    tester.runAllTests().then((success: boolean) => {
        process.exit(success ? 0 : 1);
    });
}

export default AudioServiceTester;
