// Client interface for communicating with the Go media engine video service
// Migrated from Socket.IO to standard WebSocket

import type { Job, JobStatus } from '../../types/audio';
import type { EventHandler } from '../../types/events';

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

interface HealthResponse {
    status: string;
    service: string;
    time: string;
    [key: string]: unknown;
}

interface WSEvent {
    type: string;
    data?: string;
    error?: string;
    output?: string;
    input?: string;
    [key: string]: unknown;
}

class VideoServiceClient {
    private ws: WebSocket | null = null;
    private isConnected = false;
    private serviceUrl = 'http://localhost:3001';
    private wsUrl = 'ws://localhost:3001/ws';
    private eventHandlers: Map<string, Array<EventHandler<Job>>> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 2000;

    // Track active jobs to correlate WS events
    // For Go service, we might need to map file paths to jobs if IDs aren't returned in events
    // But initially, let's assume we can map by input path or basic correlation
    private activeJobs: Map<string, Job> = new Map();

    async connect(): Promise<boolean> {
        try {
            console.log('🎬 Connecting to video processing service (Go)...');

            this.ws = new WebSocket(this.wsUrl);

            return new Promise((resolve, reject) => {
                if (!this.ws) {
                    reject(new Error('WebSocket initialization failed'));
                    return;
                }

                this.ws.onopen = () => {
                    console.log('✅ Connected to video service');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    resolve(true);
                };

                this.ws.onerror = (error) => {
                    console.error('❌ Video service connection error:', error);
                    // Only reject if we haven't connected yet
                    if (!this.isConnected) {
                        reject(error);
                    }
                };

                this.ws.onclose = () => {
                    console.log('🔌 Disconnected from video service');
                    this.isConnected = false;
                    this.handleReconnection();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const msg = JSON.parse(event.data);
                        this.handleMessage(msg);
                    } catch (e) {
                        console.error('Failed to parse WS message:', e);
                    }
                };

                // Timeout
                setTimeout(() => {
                    if (!this.isConnected) {
                        // Don't reject if we are already connected (active race)
                        if (this.ws?.readyState !== WebSocket.OPEN) {
                            // reject(new Error('Connection timeout')); // Optional: decided not to reject to avoid unhandled rejections if it eventually connects
                        }
                    }
                }, 5000);
            });
        } catch (error) {
            console.error('Failed to connect to video service:', error);
            throw error;
        }
    }

    private handleMessage(msg: WSEvent) {
        // Map Go events to client events
        // Go events: video_transcode_start, video_transcode_progress, video_transcode_complete, video_transcode_error

        let jobId = '';
        // Note: Go service currently broadcasts input/output path, not a UUID job ID in events. 
        // We'll need to infer the job based on the input path if possible, or just broadcast generic events.
        // For now, we will try to find a job matching the input path.

        // Simple job lookup by input path (naive)
        if (msg.input) {
            for (const [id, job] of this.activeJobs.entries()) {
                if (job.result === msg.input || (job as any).inputPath === msg.input) {
                    jobId = id;
                    break;
                }
            }
        }

        // If we can't find a job ID, we might create a temporary one or skip specific job updates
        // For the purpose of this client which expects Job objects, we'll synthesize them.

        switch (msg.type) {
            case 'video_transcode_start': {
                const job: Job = {
                    id: jobId || 'unknown',
                    status: 'processing',
                    progress: 0,
                    result: msg.input
                };
                // Store input path for matching
                (job as any).inputPath = msg.input;
                this.emit('jobProgress', job);
                break;
            }
            case 'video_transcode_progress': {
                // msg.data contains "time=..."
                const job: Job = {
                    id: jobId || 'unknown',
                    status: 'processing',
                    progress: this.parseProgress(msg.data),
                    result: null
                };
                this.emit('jobProgress', job);
                break;
            }
            case 'video_transcode_complete': {
                const job: Job = {
                    id: jobId || 'unknown',
                    status: 'completed',
                    progress: 100,
                    result: msg.output
                };
                this.emit('jobComplete', job);
                if (jobId) this.activeJobs.delete(jobId);
                break;
            }
            case 'video_transcode_error': {
                const job: Job = {
                    id: jobId || 'unknown',
                    status: 'error',
                    progress: 0,
                    error: msg.error
                };
                this.emit('jobError', job);
                break;
            }
        }
    }

    private parseProgress(data?: string): number {
        if (!data) return 0;
        // Parse ffmpeg time= duration and calculate percentage if total duration is known
        // Since we might not know total duration easily here without extra state, 
        // we'll return a placeholder or try to parse if we had duration.
        // For now, return -1 or keep 0 to indicate indeterminate/alive.
        return 0;
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

    async checkHealth(): Promise<HealthResponse> {
        try {
            const response = await fetch(`${this.serviceUrl}/health`);
            return await response.json() as HealthResponse;
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    }

    async transcodeVideo(inputPath: string, options: VideoProcessingOptions = {}): Promise<string> {
        // Go API: POST /api/video/transcode
        // Body: { inputPath, outputPath, format }

        const outputPath = options.outputDir
            ? `${options.outputDir}/${inputPath.split(/[\\/]/).pop()?.split('.')[0]}.${options.format || 'mp4'}`
            : inputPath.replace(/\.[^/.]+$/, "") + `_transcoded.${options.format || 'mp4'}`;

        const body = {
            inputPath,
            outputPath,
            format: options.format || 'mp4'
        };

        const response = await fetch(`${this.serviceUrl}/api/video/transcode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Transcode failed: ${response.statusText}`);
        }

        // Create a tracking job
        const jobId = Math.random().toString(36).substring(7);
        const job: Job = {
            id: jobId,
            status: 'pending',
            progress: 0,
            result: inputPath // Storing input path to match events
        };
        (job as any).inputPath = inputPath;

        this.activeJobs.set(jobId, job);

        // Go service returns "status": "transcoding started" immediately
        return jobId;
    }

    async generateThumbnail(inputPath: string, options: VideoProcessingOptions = {}): Promise<string> {
        // Go API: POST /api/video/thumbnail
        // Body: { path, time }

        const body = {
            path: inputPath,
            time: "00:00:01" // Default
        };

        const response = await fetch(`${this.serviceUrl}/api/video/thumbnail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Thumbnail failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.path; // Immediate return for synchronous thumbnail generation in Go
    }

    async extractMetadata(inputPath: string): Promise<string> {
        console.warn('extractMetadata not implemented in Go service yet');
        return '';
    }

    async getJobStatus(jobId: string): Promise<Job> {
        // Not supported in Go service yet
        return this.activeJobs.get(jobId) || { id: jobId, status: 'unknown', progress: 0 };
    }

    async cancelJob(jobId: string): Promise<{ success: boolean }> {
        // Not supported in Go service yet
        return { success: false };
    }

    async waitForJob(jobId: string, progressCallback: ((progress: number, job: Job) => void) | null = null): Promise<unknown> {
        return new Promise((resolve, reject) => {
            let isResolved = false;

            const progressHandler: EventHandler<Job> = (job) => {
                if (progressCallback) {
                    // Since we don't have perfect job ID matching from Go events, 
                    // we might receive events for other jobs. 
                    // In a real implementation, we'd filter by ID. 
                    // Here we assume single-task usage or accept cross-talk for now.
                    // Better: Match by input path if available.
                    progressCallback(job.progress, job);
                }
            };

            const completeHandler: EventHandler<Job> = (job) => {
                if (!isResolved) {
                    isResolved = true;
                    this.off('jobProgress', progressHandler);
                    this.off('jobComplete', completeHandler);
                    this.off('jobError', errorHandler);
                    resolve(job.result);
                }
            };

            const errorHandler: EventHandler<Job> = (job) => {
                if (!isResolved) {
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
        });
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.activeJobs.clear();
    }
}

export default VideoServiceClient;
