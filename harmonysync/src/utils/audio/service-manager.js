// Auto-start Node.js audio service from the frontend
// Note: Command functionality will need to be adapted for Electron

class AudioServiceManager {
    constructor() {
        this.servicePath = '/home/mikeb/projects/RustPresenter/harmonysync-audio-service';
        this.serviceUrl = 'http://localhost:3001';
        this.isServiceRunning = false;
    }

    async checkServiceHealth() {
        try {
            const api = await import('../api');
            await api.health();
            return true;
        } catch (error) {
            return false;
        }
    }

    async startService() {
        try {
            console.log('🚀 Starting Node.js audio service...');
            
            // TODO: Adapt for Electron - use child_process or IPC instead of Command
            console.warn('Command functionality needs to be adapted for Electron');
            
            // For now, just try to connect and assume service is started externally
            const isHealthy = await this.checkServiceHealth();
            if (isHealthy) {
                this.isServiceRunning = true;
                return true;
            } else {
                throw new Error('Service not running - start it manually');
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
            // TODO: Adapt for Electron - use child_process or IPC instead of Command
            console.warn('Command functionality needs to be adapted for Electron');
            
            this.isServiceRunning = false;
            console.log('🛑 Audio service stopped');
        } catch (error) {
            console.error('Failed to stop audio service:', error);
        }
    }
}

export default AudioServiceManager;