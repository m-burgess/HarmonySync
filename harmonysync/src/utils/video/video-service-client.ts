// Client interface for communicating with the Node.js video processing service

import io, { Socket } from 'socket.io-client';
import type { Job } from '../../types/audio';
import type { EventHandler } from '../../types/events';

/**
 * Video processing options
 */
interface VideoProcessingOptions {
  codec?: string;
  bitrate?: string;
  resolution?: string;
  fps?: number;
  format?: string;
  outputDir?: string;
  timestamp?: number;
  size?: string;
  [key: string]: unknown;
}

/**
 * Queue status response
 */
interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
}

/**
 * Health check response
 */
interface HealthResponse {
  status: string;
  [key: string]: unknown;
}

class VideoServiceClient {
    private socket: Socket | null = null;
    private isConnected = false;
    private serviceUrl = 'http://localhost:3002';
    private eventHandlers: Map<string, Array<EventHandler<Job>>> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 2000;
    private activeJobs: Map<string, Job> = new Map();

    /**
     * Initialize connection to video service
     */
    async connect(): Promise<boolean> {
        try {
            console.log('🎬 Connecting to video processing service...');
            
            this.socket = io(this.serviceUrl, {
                transports: ['websocket', 'polling'],
                timeout: 5000,
                forceNew: true
            });

            return new Promise((resolve, reject) => {
                if (!this.socket) {
                    reject(new Error('Socket initialization failed'));
                    return;
                }

                this.socket.on('connect', () => {
                    console.log('✅ Connected to video service');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.setupEventHandlers();
                    resolve(true);
                });

                this.socket.on('connect_error', (error: Error) => {
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

    private setupEventHandlers(): void {
        if (!this.socket) return;

        this.socket.on('job:created', (job: Job) => {
            this.activeJobs.set(job.id, job);
            this.emit('jobCreated', job);
        });

        this.socket.on('job:progress', (job: Job) => {
            this.activeJobs.set(job.id, job);
            this.emit('jobProgress', job);
        });

        this.socket.on('job:complete', (job: Job) => {
            this.activeJobs.set(job.id, job);
            this.emit('jobComplete', job);
            // Remove from active jobs after delay
            setTimeout(() => this.activeJobs.delete(job.id), 60000);
        });

        this.socket.on('job:error', (job: Job) => {
            this.activeJobs.set(job.id, job);
            this.emit('jobError', job);
        });
    }

    private async handleReconnection(): Promise<void> {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('connectionLost', { id: '', status: 'error', progress: 0, error: 'Connection lost' });
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

    /**
     * Event handling
     */
    on(event: string, handler: EventHandler<Job>): void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)?.push(handler);
    }

    off(event: string, handler: EventHandler<Job>): void {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
        }
    }

    private emit(event: string, data: Job): void {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event)?.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Video service methods
     */
    async checkHealth(): Promise<HealthResponse> {
        try {
            const response = await fetch(`${this.serviceUrl}/api/health`);
            return await response.json() as HealthResponse;
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    }

    /**
     * Transcode a video file
     */
    async transcodeVideo(inputPath: string, options: VideoProcessingOptions = {}): Promise<string> {
        if (!this.isConnected) {
            throw new Error('Not connected to video service');
        }

        return new Promise((resolve) => {
            this.socket?.emit('video:transcode', { inputPath, options });
            
            // Wait for job creation
            const handler: EventHandler<Job> = (job) => {
                this.off('jobCreated', handler);
                resolve(job.id);
            };
            this.on('jobCreated', handler);
        });
    }

    /**
     * Generate video thumbnail
     */
    async generateThumbnail(inputPath: string, options: VideoProcessingOptions = {}): Promise<string> {
        if (!this.isConnected) {
            throw new Error('Not connected to video service');
        }

        return new Promise((resolve) => {
            this.socket?.emit('video:thumbnail', { inputPath, options });
            
            const handler: EventHandler<Job> = (job) => {
                this.off('jobCreated', handler);
                resolve(job.id);
            };
            this.on('jobCreated', handler);
        });
    }

    /**
     * Extract video metadata
     */
    async extractMetadata(inputPath: string): Promise<string> {
        if (!this.isConnected) {
            throw new Error('Not connected to video service');
        }

        return new Promise((resolve) => {
            this.socket?.emit('video:metadata', { inputPath });
            
            const handler: EventHandler<Job> = (job) => {
                this.off('jobCreated', handler);
                resolve(job.id);
            };
            this.on('jobCreated', handler);
        });
    }

    /**
     * Get job status
     */
    async getJobStatus(jobId: string): Promise<Job> {
        try {
            const response = await fetch(`${this.serviceUrl}/api/jobs/${jobId}`);
            if (!response.ok) {
                throw new Error(`Job not found: ${jobId}`);
            }
            return await response.json() as Job;
        } catch (error) {
            console.error('Failed to get job status:', error);
            throw error;
        }
    }

    /**
     * Cancel a job
     */
    async cancelJob(jobId: string): Promise<{ success: boolean }> {
        try {
            const response = await fetch(`${this.serviceUrl}/api/jobs/${jobId}`, {
                method: 'DELETE'
            });
            return await response.json() as { success: boolean };
        } catch (error) {
            console.error('Failed to cancel job:', error);
            throw error;
        }
    }

    /**
     * Wait for job completion
     */
    async waitForJob(jobId: string, progressCallback: ((progress: number, job: Job) => void) | null = null): Promise<unknown> {
        return new Promise((resolve, reject) => {
            let isResolved = false;

            const progressHandler: EventHandler<Job> = (job) => {
                if (job.id === jobId && progressCallback) {
                    progressCallback(job.progress, job);
                }
            };

            const completeHandler: EventHandler<Job> = (job) => {
                if (job.id === jobId && !isResolved) {
                    isResolved = true;
                    this.off('jobProgress', progressHandler);
                    this.off('jobComplete', completeHandler);
                    this.off('jobError', errorHandler);
                    resolve(job.result);
                }
            };

            const errorHandler: EventHandler<Job> = (job) => {
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

    /**
     * Disconnect from service
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.activeJobs.clear();
    }
}

export default VideoServiceClient;
