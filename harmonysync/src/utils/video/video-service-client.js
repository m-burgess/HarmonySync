// Client interface for communicating with the Node.js video processing service

import io from 'socket.io-client';

class VideoServiceClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.serviceUrl = 'http://localhost:3002';
        this.eventHandlers = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.activeJobs = new Map();
    }

    // Initialize connection to video service
    async connect() {
        try {
            console.log('🎬 Connecting to video processing service...');
            
            this.socket = io(this.serviceUrl, {
                transports: ['websocket', 'polling'],
                timeout: 5000,
                forceNew: true
            });

            return new Promise((resolve, reject) => {
                this.socket.on('connect', () => {
                    console.log('✅ Connected to video service');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.setupEventHandlers();
                    resolve(true);
                });

                this.socket.on('connect_error', (error) => {
                    console.error('❌ Video service connection error:', error);
                    this.isConnected = false;
                    reject(error);
                });

                this.socket.on('disconnect', () => {
                    console.log('🔌 Disconnected from video service');
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
            console.error('Failed to connect to video service:', error);
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
            // Remove from active jobs after delay
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

    // Event handling
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

    // Video service methods
    async checkHealth() {
        try {
            const response = await fetch(`${this.serviceUrl}/api/health`);
            return await response.json();
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    }

    /**
     * Transcode a video file
     * @param {string} inputPath - Path to input video
     * @param {Object} options - Transcoding options
     * @returns {Promise<string>} Job ID
     */
    async transcodeVideo(inputPath, options = {}) {
        if (!this.isConnected) {
            throw new Error('Not connected to video service');
        }

        return new Promise((resolve) => {
            this.socket.emit('video:transcode', { inputPath, options });
            
            // Wait for job creation
            const handler = (job) => {
                this.off('jobCreated', handler);
                resolve(job.id);
            };
            this.on('jobCreated', handler);
        });
    }

    /**
     * Generate video thumbnail
     * @param {string} inputPath - Path to input video
     * @param {Object} options - Thumbnail options (timestamp, size, outputDir)
     * @returns {Promise<string>} Job ID
     */
    async generateThumbnail(inputPath, options = {}) {
        if (!this.isConnected) {
            throw new Error('Not connected to video service');
        }

        return new Promise((resolve) => {
            this.socket.emit('video:thumbnail', { inputPath, options });
            
            const handler = (job) => {
                this.off('jobCreated', handler);
                resolve(job.id);
            };
            this.on('jobCreated', handler);
        });
    }

    /**
     * Extract video metadata
     * @param {string} inputPath - Path to input video
     * @returns {Promise<string>} Job ID
     */
    async extractMetadata(inputPath) {
        if (!this.isConnected) {
            throw new Error('Not connected to video service');
        }

        return new Promise((resolve) => {
            this.socket.emit('video:metadata', { inputPath });
            
            const handler = (job) => {
                this.off('jobCreated', handler);
                resolve(job.id);
            };
            this.on('jobCreated', handler);
        });
    }

    /**
     * Get job status
     * @param {string} jobId - Job ID
     * @returns {Promise<Object>} Job status
     */
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

    /**
     * Cancel a job
     * @param {string} jobId - Job ID
     * @returns {Promise<Object>} Cancellation result
     */
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

    /**
     * Wait for job completion
     * @param {string} jobId - Job ID
     * @param {Function} progressCallback - Progress callback
     * @returns {Promise<Object>} Job result
     */
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

            // Check if job already exists and is complete
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

    // Disconnect from service
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.activeJobs.clear();
    }
}

export default VideoServiceClient;
