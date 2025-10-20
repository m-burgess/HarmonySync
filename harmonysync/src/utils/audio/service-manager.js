// Auto-start Node.js audio service from the frontend
import { Command } from '@tauri-apps/plugin-shell';

class AudioServiceManager {
    constructor() {
        this.servicePath = '/home/mikeb/projects/RustPresenter/harmonysync-audio-service';
        this.serviceUrl = 'http://localhost:3001';
        this.isServiceRunning = false;
    }

    async checkServiceHealth() {
        try {
            const response = await fetch(`${this.serviceUrl}/api/health`, {
                method: 'GET',
                timeout: 2000
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async startService() {
        try {
            console.log('🚀 Starting Node.js audio service...');
            
            // Use Tauri shell plugin to run the start script
            const command = Command.create('start-audio-service', [
                'bash', 
                `${this.servicePath}/start-service.sh`, 
                'start'
            ]);
            
            const output = await command.execute();
            
            if (output.code === 0) {
                console.log('✅ Audio service started successfully');
                
                // Wait a moment for service to fully start
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Verify it's actually running
                const isHealthy = await this.checkServiceHealth();
                if (isHealthy) {
                    this.isServiceRunning = true;
                    return true;
                } else {
                    throw new Error('Service started but health check failed');
                }
            } else {
                throw new Error(`Service start failed with code ${output.code}: ${output.stderr}`);
            }
        } catch (error) {
            console.error('❌ Failed to start audio service:', error);
            throw error;
        }
    }

    async ensureServiceRunning() {
        try {
            // Check if service is already running
            const isRunning = await this.checkServiceHealth();
            
            if (isRunning) {
                console.log('✅ Audio service already running');
                this.isServiceRunning = true;
                return true;
            }

            // Service not running, try to start it
            console.log('🔄 Audio service not running, starting...');
            await this.startService();
            return true;
            
        } catch (error) {
            console.error('❌ Failed to ensure audio service is running:', error);
            throw error;
        }
    }

    async stopService() {
        try {
            const command = Command.create('stop-audio-service', [
                'bash', 
                `${this.servicePath}/start-service.sh`, 
                'stop'
            ]);
            
            await command.execute();
            this.isServiceRunning = false;
            console.log('🛑 Audio service stopped');
        } catch (error) {
            console.error('Failed to stop audio service:', error);
        }
    }
}

export default AudioServiceManager;