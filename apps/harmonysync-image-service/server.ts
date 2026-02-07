import express, { Request, Response, Application } from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import sharp from 'sharp';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const HOST: string = process.env.HOST || '127.0.0.1';
const PORT: number = parseInt(process.env.PORT || '3003', 10);
const SHUTDOWN_TOKEN: string | null = process.env.SHUTDOWN_TOKEN || null;
const MAX_CONCURRENT_JOBS: number = parseInt(process.env.MAX_CONCURRENT_JOBS || '3', 10);
const IS_TEST_ENV: boolean = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
let isShuttingDown = false;

// Job types
type JobType = 'resize' | 'convert' | 'thumbnail' | 'optimize' | 'batch';
type JobStatus = 'queued' | 'processing' | 'completed' | 'error' | 'cancelled';

interface JobOptions {
    outputDir?: string;
    width?: number;
    height?: number;
    fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
    position?: string;
    background?: { r: number; g: number; b: number; alpha: number };
    format?: string;
    quality?: number;
    progressive?: boolean;
    compressionLevel?: number;
    lossless?: boolean;
    maxWidth?: number;
    filename?: string;
    images?: string[];
    operation?: string;
}

interface JobJSON {
    id: string;
    type: JobType;
    status: JobStatus;
    progress: number;
    result: any;
    error: string | null;
    duration: number;
}

// Job management
const jobs = new Map<string, ImageJob>();
const jobQueue: ImageJob[] = [];
let activeJobCount: number = 0;
const cleanupTimers = new Map<string, NodeJS.Timeout>();

class ImageJob {
    public id: string;
    public type: JobType;
    public inputPath: string | null;
    public options: JobOptions;
    public status: JobStatus;
    public progress: number;
    public result: any;
    public error: string | null;
    public startTime: number;
    public endTime: number | null;
    public sharpPipeline: sharp.Sharp | null;

    constructor(id: string, type: JobType, inputPath: string | null, options: JobOptions = {}) {
        this.id = id;
        this.type = type;
        this.inputPath = inputPath;
        this.options = options;
        this.status = 'queued';
        this.progress = 0;
        this.result = null;
        this.error = null;
        this.startTime = Date.now();
        this.endTime = null;
        this.sharpPipeline = null;
    }

    cancel(): void {
        this.status = 'cancelled';
        this.endTime = Date.now();
    }

    toJSON(): JobJSON {
        return {
            id: this.id,
            type: this.type,
            status: this.status,
            progress: this.progress,
            result: this.result,
            error: this.error,
            duration: this.endTime ? this.endTime - this.startTime : Date.now() - this.startTime
        };
    }
}

// Process queue
async function processQueue(io: SocketIOServer): Promise<void> {
    if (activeJobCount >= MAX_CONCURRENT_JOBS || jobQueue.length === 0) {
        return;
    }

    const job = jobQueue.shift();
    if (!job || job.status === 'cancelled') {
        processQueue(io);
        return;
    }

    activeJobCount++;
    job.status = 'processing';
    io.emit('job:progress', job.toJSON());

    try {
        switch (job.type) {
            case 'resize':
                await resizeImage(job, io);
                break;
            case 'convert':
                await convertFormat(job, io);
                break;
            case 'thumbnail':
                await generateThumbnail(job, io);
                break;
            case 'optimize':
                await optimizeForWeb(job, io);
                break;
            case 'batch':
                await processBatch(job, io);
                break;
        }
    } catch (error) {
        console.error(`Job ${job.id} error:`, error);
    } finally {
        activeJobCount--;
        // Clean up job after 5 minutes (store timer so tests can clear it)
        const t = setTimeout(() => jobs.delete(job.id), 5 * 60 * 1000);
        cleanupTimers.set(job.id, t as unknown as NodeJS.Timeout);
        // Process next job in queue
        processQueue(io);
    }
}

function clearAllJobCleanupTimers(): void {
    for (const t of cleanupTimers.values()) {
        try { clearTimeout(t as unknown as number); } catch (e) {}
    }
    cleanupTimers.clear();
}

// Image processing functions
async function resizeImage(job: ImageJob, io: SocketIOServer): Promise<void> {
    try {
        const { inputPath, options = {} } = job;
        if (!inputPath) {
            throw new Error('Input path is required for resize operation');
        }

        const outputDir = options.outputDir || path.dirname(inputPath);
        const fileName = path.basename(inputPath, path.extname(inputPath));
        const ext = path.extname(inputPath);
        const outputPath = path.join(outputDir, `${fileName}_${options.width}x${options.height || 'auto'}${ext}`);

        await fs.ensureDir(outputDir);

        const resizeOptions: sharp.ResizeOptions = { 
            width: options.width,
            fit: options.fit || 'contain',
            position: options.position || 'center',
            background: options.background || { r: 0, g: 0, b: 0, alpha: 0 }
        };

        if (options.height) {
            resizeOptions.height = options.height;
        }

        await sharp(inputPath)
            .resize(resizeOptions)
            .toFile(outputPath);

        if (job.status === 'cancelled') {
            job.endTime = Date.now();
            io.emit('job:complete', job.toJSON());
            console.log(`⚠️ Resize cancelled: ${job.id}`);
            return;
        }

        job.status = 'completed';
        job.progress = 100;
        job.result = { outputPath };
        job.endTime = Date.now();
        io.emit('job:complete', job.toJSON());
        console.log(`✅ Image resized: ${outputPath}`);
    } catch (error) {
        job.status = 'error';
        job.error = error instanceof Error ? error.message : String(error);
        job.endTime = Date.now();
        io.emit('job:error', job.toJSON());
        console.error(`❌ Resize error: ${job.error}`);
        throw error;
    }
}

async function convertFormat(job: ImageJob, io: SocketIOServer): Promise<void> {
    try {
        const { inputPath, options = {} } = job;
        if (!inputPath) {
            throw new Error('Input path is required for convert operation');
        }

        const outputDir = options.outputDir || path.dirname(inputPath);
        const fileName = path.basename(inputPath, path.extname(inputPath));
        const format = options.format || 'jpeg';
        const outputPath = path.join(outputDir, `${fileName}.${format}`);

        await fs.ensureDir(outputDir);

        let pipeline = sharp(inputPath);

        switch (format.toLowerCase()) {
            case 'jpeg':
            case 'jpg':
                pipeline = pipeline.jpeg({
                    quality: options.quality || 90,
                    progressive: options.progressive !== false
                });
                break;
            case 'png':
                pipeline = pipeline.png({
                    compressionLevel: options.compressionLevel || 6,
                    progressive: options.progressive !== false
                });
                break;
            case 'webp':
                pipeline = pipeline.webp({
                    quality: options.quality || 80,
                    lossless: options.lossless || false
                });
                break;
            case 'avif':
                pipeline = pipeline.avif({
                    quality: options.quality || 80
                });
                break;
            case 'tiff':
                pipeline = pipeline.tiff({
                    quality: options.quality || 80
                });
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }

        await pipeline.toFile(outputPath);

        // If job was cancelled while writing, keep cancelled status
        if (job.status === 'cancelled') {
            job.endTime = Date.now();
            io.emit('job:complete', job.toJSON());
            console.log(`⚠️ Convert cancelled: ${job.id}`);
            return;
        }

        job.status = 'completed';
        job.progress = 100;
        job.result = { outputPath };
        job.endTime = Date.now();
        io.emit('job:complete', job.toJSON());
        console.log(`✅ Image converted to ${format}: ${outputPath}`);
    } catch (error) {
        job.status = 'error';
        job.error = error instanceof Error ? error.message : String(error);
        job.endTime = Date.now();
        io.emit('job:error', job.toJSON());
        console.error(`❌ Convert error: ${job.error}`);
        throw error;
    }
}

async function generateThumbnail(job: ImageJob, io: SocketIOServer): Promise<void> {
    try {
        const { inputPath, options = {} } = job;
        if (!inputPath) {
            throw new Error('Input path is required for thumbnail operation');
        }

        const outputDir = options.outputDir || path.dirname(inputPath);
        const width = options.width || 320;
        const height = options.height || null;
        const thumbnailName = options.filename || `thumb_${uuidv4()}.jpg`;
        const thumbnailPath = path.join(outputDir, thumbnailName);

        await fs.ensureDir(outputDir);

        const resizeOptions: sharp.ResizeOptions = { width };
        if (height) {
            resizeOptions.height = height;
            resizeOptions.fit = 'cover';
        }

        await sharp(inputPath)
            .resize(resizeOptions)
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);

        if (job.status === 'cancelled') {
            job.endTime = Date.now();
            io.emit('job:complete', job.toJSON());
            console.log(`⚠️ Thumbnail cancelled: ${job.id}`);
            return;
        }

        job.status = 'completed';
        job.progress = 100;
        job.result = { thumbnailPath };
        job.endTime = Date.now();
        io.emit('job:complete', job.toJSON());
        console.log(`✅ Thumbnail generated: ${thumbnailPath}`);
    } catch (error) {
        job.status = 'error';
        job.error = error instanceof Error ? error.message : String(error);
        job.endTime = Date.now();
        io.emit('job:error', job.toJSON());
        console.error(`❌ Thumbnail error: ${job.error}`);
        throw error;
    }
}

async function optimizeForWeb(job: ImageJob, io: SocketIOServer): Promise<void> {
    try {
        const { inputPath, options = {} } = job;
        if (!inputPath) {
            throw new Error('Input path is required for optimize operation');
        }

        const outputDir = options.outputDir || path.dirname(inputPath);
        const fileName = path.basename(inputPath, path.extname(inputPath));
        const outputPath = path.join(outputDir, `${fileName}_optimized.jpg`);

        await fs.ensureDir(outputDir);

        await sharp(inputPath)
            .resize({ width: options.maxWidth || 1920, withoutEnlargement: true })
            .jpeg({ quality: options.quality || 85, progressive: true })
            .toFile(outputPath);

        if (job.status === 'cancelled') {
            job.endTime = Date.now();
            io.emit('job:complete', job.toJSON());
            console.log(`⚠️ Optimize cancelled: ${job.id}`);
            return;
        }

        job.status = 'completed';
        job.progress = 100;
        job.result = { outputPath };
        job.endTime = Date.now();
        io.emit('job:complete', job.toJSON());
        console.log(`✅ Image optimized: ${outputPath}`);
    } catch (error) {
        job.status = 'error';
        job.error = error instanceof Error ? error.message : String(error);
        job.endTime = Date.now();
        io.emit('job:error', job.toJSON());
        console.error(`❌ Optimize error: ${job.error}`);
        throw error;
    }
}

async function processBatch(job: ImageJob, io: SocketIOServer): Promise<void> {
    try {
        const { options = {} } = job;
        const images = options.images || [];
        const operation = options.operation || 'resize';
        const results: any[] = [];

        for (let i = 0; i < images.length; i++) {
            if (job.status === 'cancelled') {
                break;
            }

            const imageOptions = { ...options, inputPath: images[i] };
            const subJob = new ImageJob(uuidv4(), operation as JobType, images[i], imageOptions);
            
            try {
                switch (operation) {
                    case 'resize':
                        await resizeImage(subJob, io);
                        break;
                    case 'convert':
                        await convertFormat(subJob, io);
                        break;
                    case 'thumbnail':
                        await generateThumbnail(subJob, io);
                        break;
                    case 'optimize':
                        await optimizeForWeb(subJob, io);
                        break;
                }
                results.push({ path: images[i], result: subJob.result, success: true });
            } catch (error) {
                results.push({ 
                    path: images[i], 
                    error: error instanceof Error ? error.message : String(error), 
                    success: false 
                });
            }

            job.progress = Math.round(((i + 1) / images.length) * 100);
            io.emit('job:progress', job.toJSON());
        }

        job.status = 'completed';
        job.progress = 100;
        job.result = { results, total: images.length, succeeded: results.filter(r => r.success).length };
        job.endTime = Date.now();
        io.emit('job:complete', job.toJSON());
        console.log(`✅ Batch processed: ${results.filter(r => r.success).length}/${images.length} succeeded`);
    } catch (error) {
        job.status = 'error';
        job.error = error instanceof Error ? error.message : String(error);
        job.endTime = Date.now();
        io.emit('job:error', job.toJSON());
        console.error(`❌ Batch error: ${job.error}`);
        throw error;
    }
}

// Initialize Express app
const app: Application = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

// REST API endpoints
app.get('/api/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        service: 'harmonysync-image-service',
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        activeJobs: activeJobCount,
        queuedJobs: jobQueue.length,
        maxConcurrent: MAX_CONCURRENT_JOBS
    });
});

app.get('/api/jobs/:id', (req: Request, res: Response): void => {
    const job = jobs.get(req.params.id);
    if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
    }
    res.json(job.toJSON());
});

app.delete('/api/jobs/:id', (req: Request, res: Response): void => {
    const job = jobs.get(req.params.id);
    if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
    }
    job.cancel();
    res.json({ message: 'Job cancelled', job: job.toJSON() });
});

app.get('/api/queue', (req: Request, res: Response) => {
    res.json({
        activeJobs: activeJobCount,
        queuedJobs: jobQueue.length,
        maxConcurrent: MAX_CONCURRENT_JOBS,
        queue: jobQueue.map(j => j.toJSON())
    });
});

app.post('/api/shutdown', (req: Request, res: Response): void => {
    const token = req.headers['x-shutdown-token'] || 
                  (typeof req.headers.authorization === 'string' ? 
                   req.headers.authorization.replace('Bearer ', '') : 
                   undefined);
    
    if (SHUTDOWN_TOKEN && token !== SHUTDOWN_TOKEN) {
        res.status(403).json({ error: 'Invalid shutdown token' });
        return;
    }

    console.log('🛑 Shutdown requested');
    res.json({ message: 'Shutting down...' });
    
    // Cancel all jobs
    for (const job of jobs.values()) {
        if (job.status === 'processing' || job.status === 'queued') {
            job.cancel();
        }
    }
    jobQueue.length = 0;

    setTimeout(() => {
        process.exit(0);
    }, 1000);
});

// Socket.io event handlers
io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('image:resize', (data: { inputPath: string; options: JobOptions }) => {
        const jobId = uuidv4();
        const job = new ImageJob(jobId, 'resize', data.inputPath, data.options);
        jobs.set(jobId, job);
        jobQueue.push(job);
        socket.emit('job:created', job.toJSON());
        processQueue(io);
    });

    socket.on('image:convert', (data: { inputPath: string; options: JobOptions }) => {
        const jobId = uuidv4();
        const job = new ImageJob(jobId, 'convert', data.inputPath, data.options);
        jobs.set(jobId, job);
        jobQueue.push(job);
        socket.emit('job:created', job.toJSON());
        processQueue(io);
    });

    socket.on('image:thumbnail', (data: { inputPath: string; options: JobOptions }) => {
        const jobId = uuidv4();
        const job = new ImageJob(jobId, 'thumbnail', data.inputPath, data.options);
        jobs.set(jobId, job);
        jobQueue.push(job);
        socket.emit('job:created', job.toJSON());
        processQueue(io);
    });

    socket.on('image:optimize', (data: { inputPath: string; options: JobOptions }) => {
        const jobId = uuidv4();
        const job = new ImageJob(jobId, 'optimize', data.inputPath, data.options);
        jobs.set(jobId, job);
        jobQueue.push(job);
        socket.emit('job:created', job.toJSON());
        processQueue(io);
    });

    socket.on('image:batch', (data: { options: JobOptions }) => {
        const jobId = uuidv4();
        const job = new ImageJob(jobId, 'batch', null, data.options);
        jobs.set(jobId, job);
        jobQueue.push(job);
        socket.emit('job:created', job.toJSON());
        processQueue(io);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

// Start server only when run directly
if (require.main === module) {
    server.listen(PORT, HOST, () => {
        console.log(`🖼️  HarmonySync Image Service listening on ${HOST}:${PORT}`);
        console.log(`📊 Process ID: ${process.pid}`);
        console.log(`💾 Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
        console.log(`⚙️  Max concurrent jobs: ${MAX_CONCURRENT_JOBS}`);
    });
}

// Graceful shutdown
const shutdown = (reason: string, error?: unknown, exitCode: number = 1): void => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    if (error) {
        console.error(`🛑 Image service shutting down due to ${reason}:`, error);
    } else {
        console.log(`🛑 Image service shutting down (${reason})`);
    }

    try {
        clearAllJobCleanupTimers();
        jobs.clear();
        jobQueue.length = 0;
        activeJobCount = 0;
    } catch (cleanupError) {
        console.error('Failed to cleanup image jobs:', cleanupError);
    }

    if (IS_TEST_ENV) {
        return;
    }

    try { io.close(); } catch (closeError) {
        console.error('Failed to close Socket.IO server:', closeError);
    }

    server.close(() => {
        console.log('✅ Server closed');
        process.exit(exitCode);
    });
};

process.on('SIGTERM', () => {
    shutdown('SIGTERM', undefined, 0);
});

process.on('SIGINT', () => {
    shutdown('SIGINT', undefined, 0);
});

process.on('uncaughtException', (error: Error): void => {
    if ((error as any).code === 'EADDRINUSE') {
        console.warn(`⚠️ Port ${PORT} is already in use. Assuming image service is already running.`);
        process.exit(0);
    }
    shutdown('uncaughtException', error);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<any>): void => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection', reason);
});

// Export internals for testing
// Export helper to clear timers for tests
export { app, server, io, jobs, jobQueue, ImageJob, clearAllJobCleanupTimers };
