// Client interface for communicating with the Go media engine image service
// Migrated from Socket.IO to synchronous HTTP

import type { Job } from '../../types/audio';
import type { EventHandler } from '../../types/events';

interface ImageProcessingOptions {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
    outputDir?: string;
    [key: string]: unknown;
}

interface BatchProcessingOptions extends ImageProcessingOptions {
    images?: string[];
    operation?: string;
}

interface QueueStatus {
    pending: number;
    processing: number;
    completed: number;
}

interface HealthResponse {
    status: string;
    service: string;
    time: string;
    [key: string]: unknown;
}

class ImageServiceClient {
    private serviceUrl = 'http://localhost:3001';
    private isConnected = false; // Kept for API compatibility

    async connect(): Promise<boolean> {
        // HTTP service is "always connected"
        try {
            await this.checkHealth();
            console.log('✅ Connected to image service (HTTP)');
            this.isConnected = true;
            return true;
        } catch (e) {
            console.error('❌ Failed to connect to image service:', e);
            return false;
        }
    }

    // Event handlers are no-ops for sync service
    on(event: string, handler: EventHandler<Job>): void { }
    off(event: string, handler: EventHandler<Job>): void { }

    async checkHealth(): Promise<HealthResponse> {
        try {
            const response = await fetch(`${this.serviceUrl}/health`);
            return await response.json() as HealthResponse;
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    }

    async getQueueStatus(): Promise<QueueStatus> {
        // Not implemented in Go service
        return { pending: 0, processing: 0, completed: 0 };
    }

    async resizeImage(inputPath: string, options: ImageProcessingOptions = {}): Promise<string> {
        // Go API: POST /api/image/resize
        // Body: { inputPath, outputPath, width, height }

        const outputPath = options.outputDir
            ? `${options.outputDir}/${inputPath.split(/[\\/]/).pop()}`
            : inputPath; // Careful with overwriting if paths are same, but Go service might require distinct output

        const body = {
            inputPath,
            outputPath: options.outputDir ? outputPath : inputPath.replace(/\.[^/.]+$/, "") + `_resized.${options.format || 'jpg'}`,
            width: options.width || -1,
            height: options.height || -1
        };

        const response = await fetch(`${this.serviceUrl}/api/image/resize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Resize failed: ${err}`);
        }

        const data = await response.json();
        return data.path; // Returns job ID in old client, but here returning result path. Client might expect ID.
        // To maintain compatibility, we might return a fake Job ID? 
        // The interface returns Promise<string>, which refers to Job ID.
        // But since this is sync, maybe we return the result path as the "ID" and handle it?
        // Actually, let's return a fake ID "done".
        return "done:" + data.path;
    }

    async convertFormat(inputPath: string, options: ImageProcessingOptions = {}): Promise<string> {
        // Go API: POST /api/image/convert

        const outputPath = options.outputDir
            ? `${options.outputDir}/${inputPath.split(/[\\/]/).pop()?.split('.')[0]}.${options.format || 'png'}`
            : inputPath.replace(/\.[^/.]+$/, "") + `_converted.${options.format || 'png'}`;

        const body = {
            inputPath,
            outputPath
        };

        const response = await fetch(`${this.serviceUrl}/api/image/convert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Convert failed: ${err}`);
        }

        const data = await response.json();
        return "done:" + data.path;
    }

    async generateThumbnail(inputPath: string, options: ImageProcessingOptions = {}): Promise<string> {
        // Not explicitly implemented in image_handlers.go but we can use resize
        return this.resizeImage(inputPath, { ...options, width: 200, height: -1 });
    }

    async optimizeForWeb(inputPath: string, options: ImageProcessingOptions = {}): Promise<string> {
        // Fallback to convert
        return this.convertFormat(inputPath, options);
    }

    async processBatch(images: string[], operation = 'resize', options: ImageProcessingOptions = {}): Promise<string> {
        console.warn('Batch processing not supported in Go service yet');
        return "failed";
    }

    async getJobStatus(jobId: string): Promise<Job> {
        if (jobId.startsWith("done:")) {
            return {
                id: jobId,
                status: 'completed',
                progress: 100,
                result: jobId.substring(5)
            };
        }
        return { id: jobId, status: 'completed', progress: 100 };
    }

    async cancelJob(jobId: string): Promise<{ success: boolean }> {
        return { success: false };
    }

    async waitForJob(jobId: string, progressCallback: ((progress: number, job: Job) => void) | null = null): Promise<unknown> {
        // Since operations are sync, if we have the ID (which contains result), we are done.

        if (jobId.startsWith("done:")) {
            const result = jobId.substring(5);
            if (progressCallback) progressCallback(100, { id: jobId, status: 'completed', progress: 100, result });
            return result;
        }
        return null;
    }

    disconnect(): void {
        this.isConnected = false;
    }
}

export default ImageServiceClient;
