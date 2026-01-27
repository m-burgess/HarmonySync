// Simple service checker that provides user feedback (no shell permissions needed)

import type { ServiceStatus, StartupInstructions, MemoryUsage } from '../../types/audio';

class AudioServiceChecker {
    private serviceUrl = 'http://localhost:3001';
    private lastCheckTime = 0;
    private checkInterval = 5000; // Check every 5 seconds

    async checkServiceStatus(): Promise<ServiceStatus> {
        try {
            // Use the typed API client (lazy import to avoid bundling issues)
            const api = await import('../api');
            const health = await api.health();
            return {
                isRunning: true,
                memoryUsage: health.memoryUsage,
                version: health.version
            };
        } catch (error: unknown) {
            const err = error as { name?: string; message?: string };
            return { 
                isRunning: false, 
                error: err.name === 'TimeoutError' ? 'Service timeout' : (err.message || 'Connection failed')
            };
        }
    }

    async waitForService(timeoutMs = 30000): Promise<ServiceStatus> {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            const status = await this.checkServiceStatus();
            if (status.isRunning) {
                return status;
            }
            
            // Wait 1 second before next check
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        throw new Error('Service did not start within timeout period');
    }

    getStartupInstructions(): StartupInstructions {
        return {
            title: '🎵 Audio Service Required',
            message: 'The Node.js audio service needs to be started manually.',
            instructions: [
                'Open a terminal',
                'Navigate to: harmonysync-audio-service/',
                'Run: ./start-service.sh start',
                'Wait for "Service started successfully" message',
                'Refresh this page or try again'
            ],
            commands: [
                'cd harmonysync-audio-service',
                './start-service.sh start'
            ]
        };
    }

    createStatusDisplay(containerElement?: HTMLElement): HTMLDivElement {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'audio-service-status';
        statusDiv.innerHTML = `
            <div class="flex items-center gap-2 p-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-md">
                <div class="animate-spin w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
                <span class="text-sm">Checking audio service...</span>
            </div>
        `;
        
        if (containerElement) {
            containerElement.appendChild(statusDiv);
        }
        
        return statusDiv;
    }

    updateStatusDisplay(statusElement: HTMLElement | null, status: ServiceStatus): void {
        if (!statusElement) return;
        
        if (status.isRunning && status.memoryUsage) {
            const memoryMB = (status.memoryUsage.rss / 1024 / 1024).toFixed(1);
            statusElement.innerHTML = `
                <div class="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-md">
                    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span class="text-sm">Audio service connected (${memoryMB}MB)</span>
                </div>
            `;
        } else {
            const instructions = this.getStartupInstructions();
            statusElement.innerHTML = `
                <div class="p-4 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-md">
                    <div class="flex items-center gap-2 mb-2">
                        <div class="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span class="font-medium text-sm">${instructions.title}</span>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">${instructions.message}</p>
                    <div class="bg-gray-800 text-green-400 p-2 rounded text-xs font-mono">
                        ${instructions.commands.join('\n')}
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Error: ${status.error || 'Unknown error'}
                    </p>
                </div>
            `;
        }
    }
}

export default AudioServiceChecker;
