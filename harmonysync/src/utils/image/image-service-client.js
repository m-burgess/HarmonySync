// Client interface for communicating with the Node.js image processing service

import io from 'socket.io-client';

class ImageServiceClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.serviceUrl = 'http://localhost:3003';
        this.eventHandlers = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.activeJobs = new Map();
    }

    async connect() {
        try {
            console.log('🖼️  Connecting to image processing service...');
            
            this.socket = io(this.serviceUrl, {
                transports: ['websocket', 'polling'],
                timeout: 5000,
                forceNew: true
            });

            return new Promise((resolve, reject) => {
                this.socket.on('connect', () => {
                    console.log('✅ Connected to image service');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.setupEventHandlers();
                    resolve(true);
                });

                this.socket.on('connect_error', (error) => {
                    console.error('❌ Image service connection error:', error);
                    this.isConnected = false;
                    reject(error);
                });

                this.socket.on('disconnect', () => {
                    console.log('🔌 Disconnected from image service');
                    this.isConnected = false;
                    this.handleReconnection();
                });

                setTimeout(() => {
                    if (!this.isConnected) {
                        reject(new Error('Connection timeout'));
                    }
                }, 5000);
            });
        } catch (error) {
            console.error('Failed to connect to image service:', error);
            throw error;
        }
    }

    setupEventHandlers() {
        this.socket.on('job:created', (job) => {
            this.activeJobs.set(job.id, job);
            this.emit('jobCreated', job);
        });

        this.socket.on('job:progress', (job) => {
            this.activeJobs.set(job.id, job);
            this.emit('jobProgress', job);
        });

        this.socket.on('job:complete', (job) => {
            this.activeJobs.set(job.id, job);
            this.emit('jobComplete', job);
            setTimeout(() => this.activeJobs.delete(job.id), 60000);
        });

        this.socket.on('job:error', (job) => {
            this.activeJobs.set(job.id, job);
            this.emit('jobError', job);
        });
    }

    async handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('connectionLost');
            return;
        }

        this.reconnectAttempts++;
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(async () => {
            try {
                await this.connect();
            } catch (error) {
                console.error('Reconnection failed:', error);
            }
        }, this.reconnectDelay);
    }

    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    async checkHealth() {
        try {
            const response = await fetch(`${this.serviceUrl}/api/health`);
            return await response.json();
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    }

    async getQueueStatus() {
        try {
            const response = await fetch(`${this.serviceUrl}/api/queue`);
            return await response.json();
        } catch (error) {
            console.error('Failed to get queue status:', error);
            throw error;
        }
    }

    async resizeImage(inputPath, options = {}) {
        if (!this.isConnected) {
            throw new Error('Not connected to image service');
        }

        return new Promise((resolve) => {
            this.socket.emit('image:resize', { inputPath, options });
            
            const handler = (job) => {
                this.off('jobCreated', handler);
                resolve(job.id);
            };
            this.on('jobCreated', handler);
        });
    }

    async convertFormat(inputPath, options = {}) {
        if (!this.isConnected) {
            throw new Error('Not connected to image service');
        }

        return new Promise((resolve) => {
            this.socket.emit('image:convert', { inputPath, options });
            
            const handler = (job) => {
                this.off('jobCreated', handler);
                resolve(job.id);
            };
            this.on('jobCreated', handler);
        });
    }

    async generateThumbnail(inputPath, options = {}) {
        if (!this.isConnected) {
            throw new Error('Not connected to image service');
        }

        return new Promise((resolve) => {
            this.socket.emit('image:thumbnail', { inputPath, options });
            
            const handler = (job) => {
                this.off('jobCreated', handler);
                resolve(job.id);
            };
            this.on('jobCreated', handler);
        });
    }

    async optimizeForWeb(inputPath, options = {}) {
        if (!this.isConnected) {
            throw new Error('Not connected to image service');
        }

        return new Promise((resolve) => {
            this.socket.emit('image:optimize', { inputPath, options });
            
            const handler = (job) => {
                this.off('jobCreated', handler);
                resolve(job.id);
            };
            this.on('jobCreated', handler);
        });
    }

    async processBatch(images, operation = 'resize', options = {}) {
        if (!this.isConnected) {
            throw new Error('Not connected to image service');
        }

        return new Promise((resolve) => {
            this.socket.emit('image:batch', { options: { images, operation, ...options } });
            
            const handler = (job) => {
                this.off('jobCreated', handler);
                resolve(job.id);
            };
            this.on('jobCreated', handler);
        });
    }

    async getJobStatus(jobId) {
        try {
            const response = await fetch(`${this.serviceUrl}/api/jobs/${jobId}`);
            if (!response.ok) {
                throw new Error(`Job not found: ${jobId}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to get job status:', error);
            throw error;
        }
    }

    async cancelJob(jobId) {
        try {
            const response = await fetch(`${this.serviceUrl}/api/jobs/${jobId}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to cancel job:', error);
            throw error;
        }
    }

    async waitForJob(jobId, progressCallback = null) {
        return new Promise((resolve, reject) => {
            let isResolved = false;

            const progressHandler = (job) => {
                if (job.id === jobId && progressCallback) {
                    progressCallback(job.progress, job);
                }
            };

            const completeHandler = (job) => {
                if (job.id === jobId && !isResolved) {
                    isResolved = true;
                    this.off('jobProgress', progressHandler);
                    this.off('jobComplete', completeHandler);
                    this.off('jobError', errorHandler);
                    resolve(job.result);
                }
            };

            const errorHandler = (job) => {
                if (job.id === jobId && !isResolved) {
                    isResolved = true;
                    this.off('jobProgress', progressHandler);
                    this.off('jobComplete', completeHandler);
                    this.off('jobError', errorHandler);
                    reject(new Error(job.error));
                }
            };

            this.on('jobProgress', progressHandler);
            this.on('jobComplete', completeHandler);
            this.on('jobError', errorHandler);

            const existingJob = this.activeJobs.get(jobId);
            if (existingJob) {
                if (existingJob.status === 'completed') {
                    isResolved = true;
                    resolve(existingJob.result);
                } else if (existingJob.status === 'error') {
                    isResolved = true;
                    reject(new Error(existingJob.error));
                }
            }
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.activeJobs.clear();
    }
}

export default ImageServiceClient;
