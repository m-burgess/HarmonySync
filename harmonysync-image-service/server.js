const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration
const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 3003;
const SHUTDOWN_TOKEN = process.env.SHUTDOWN_TOKEN || null;
const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || '3', 10);

// Job management
const jobs = new Map();
const jobQueue = [];
let activeJobCount = 0;

class ImageJob {
    constructor(id, type, inputPath, options = {}) {
        this.id = id;
        this.type = type; // 'resize', 'convert', 'thumbnail', 'optimize', 'batch'
        this.inputPath = inputPath;
        this.options = options;
        this.status = 'queued'; // queued, processing, completed, error, cancelled
        this.progress = 0;
        this.result = null;
        this.error = null;
        this.startTime = Date.now();
        this.endTime = null;
        this.sharpPipeline = null;
    }

    cancel() {
        this.status = 'cancelled';
        this.endTime = Date.now();
    }

    toJSON() {
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
async function processQueue(io) {
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
        // Clean up job after 5 minutes
        setTimeout(() => jobs.delete(job.id), 5 * 60 * 1000);
        // Process next job in queue
        processQueue(io);
    }
}

// Image processing functions
async function resizeImage(job, io) {
    try {
        const { inputPath, options = {} } = job;
        const outputDir = options.outputDir || path.dirname(inputPath);
        const fileName = path.basename(inputPath, path.extname(inputPath));
        const ext = path.extname(inputPath);
        const outputPath = path.join(outputDir, `${fileName}_${options.width}x${options.height || 'auto'}${ext}`);

        fs.ensureDirSync(outputDir);

        const resizeOptions = { 
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

        job.status = 'completed';
        job.progress = 100;
        job.result = { outputPath };
        job.endTime = Date.now();
        io.emit('job:complete', job.toJSON());
        console.log(`✅ Image resized: ${outputPath}`);
    } catch (error) {
        job.status = 'error';
        job.error = error.message;
        job.endTime = Date.now();
        io.emit('job:error', job.toJSON());
        console.error(`❌ Resize error: ${error.message}`);
        throw error;
    }
}

async function convertFormat(job, io) {
    try {
        const { inputPath, options = {} } = job;
        const outputDir = options.outputDir || path.dirname(inputPath);
        const fileName = path.basename(inputPath, path.extname(inputPath));
        const format = options.format || 'jpeg';
        const outputPath = path.join(outputDir, `${fileName}.${format}`);

        fs.ensureDirSync(outputDir);

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

        job.status = 'completed';
        job.progress = 100;
        job.result = { outputPath };
        job.endTime = Date.now();
        io.emit('job:complete', job.toJSON());
        console.log(`✅ Image converted to ${format}: ${outputPath}`);
    } catch (error) {
        job.status = 'error';
        job.error = error.message;
        job.endTime = Date.now();
        io.emit('job:error', job.toJSON());
        console.error(`❌ Convert error: ${error.message}`);
        throw error;
    }
}

async function generateThumbnail(job, io) {
    try {
        const { inputPath, options = {} } = job;
        const outputDir = options.outputDir || path.dirname(inputPath);
        const width = options.width || 320;
        const height = options.height || null;
        const thumbnailName = options.filename || `thumb_${uuidv4()}.jpg`;
        const thumbnailPath = path.join(outputDir, thumbnailName);

        fs.ensureDirSync(outputDir);

        const resizeOptions = { width };
        if (height) {
            resizeOptions.height = height;
            resizeOptions.fit = 'cover';
        }

        await sharp(inputPath)
            .resize(resizeOptions)
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);

        job.status = 'completed';
        job.progress = 100;
        job.result = { thumbnailPath };
        job.endTime = Date.now();
        io.emit('job:complete', job.toJSON());
        console.log(`✅ Thumbnail generated: ${thumbnailPath}`);
    } catch (error) {
        job.status = 'error';
        job.error = error.message;
        job.endTime = Date.now();
        io.emit('job:error', job.toJSON());
        console.error(`❌ Thumbnail error: ${error.message}`);
        throw error;
    }
}

async function optimizeForWeb(job, io) {
    try {
        const { inputPath, options = {} } = job;
        const outputDir = options.outputDir || path.dirname(inputPath);
        const fileName = path.basename(inputPath, path.extname(inputPath));
        const outputPath = path.join(outputDir, `${fileName}_optimized.jpg`);

        fs.ensureDirSync(outputDir);

        await sharp(inputPath)
            .resize({ width: options.maxWidth || 1920, withoutEnlargement: true })
            .jpeg({ quality: options.quality || 85, progressive: true })
            .toFile(outputPath);

        job.status = 'completed';
        job.progress = 100;
        job.result = { outputPath };
        job.endTime = Date.now();
        io.emit('job:complete', job.toJSON());
        console.log(`✅ Image optimized: ${outputPath}`);
    } catch (error) {
        job.status = 'error';
        job.error = error.message;
        job.endTime = Date.now();
        io.emit('job:error', job.toJSON());
        console.error(`❌ Optimize error: ${error.message}`);
        throw error;
    }
}

async function processBatch(job, io) {
    try {
        const { options = {} } = job;
        const images = options.images || [];
        const operation = options.operation || 'resize';
        const results = [];

        for (let i = 0; i < images.length; i++) {
            if (job.status === 'cancelled') {
                break;
            }

            const imageOptions = { ...options, inputPath: images[i] };
            const subJob = new ImageJob(uuidv4(), operation, images[i], imageOptions);
            
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
                results.push({ path: images[i], error: error.message, success: false });
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
        job.error = error.message;
        job.endTime = Date.now();
        io.emit('job:error', job.toJSON());
        console.error(`❌ Batch error: ${error.message}`);
        throw error;
    }
}

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

// REST API endpoints
app.get('/api/health', (req, res) => {
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

app.get('/api/jobs/:id', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job.toJSON());
});

app.delete('/api/jobs/:id', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    job.cancel();
    res.json({ message: 'Job cancelled', job: job.toJSON() });
});

app.get('/api/queue', (req, res) => {
    res.json({
        activeJobs: activeJobCount,
        queuedJobs: jobQueue.length,
        maxConcurrent: MAX_CONCURRENT_JOBS,
        queue: jobQueue.map(j => j.toJSON())
    });
});

app.post('/api/shutdown', (req, res) => {
    const token = req.headers['x-shutdown-token'] || req.headers.authorization?.replace('Bearer ', '');
    
    if (SHUTDOWN_TOKEN && token !== SHUTDOWN_TOKEN) {
        return res.status(403).json({ error: 'Invalid shutdown token' });
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
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('image:resize', (data) => {
        const jobId = uuidv4();
        const job = new ImageJob(jobId, 'resize', data.inputPath, data.options);
        jobs.set(jobId, job);
        jobQueue.push(job);
        socket.emit('job:created', job.toJSON());
        processQueue(io);
    });

    socket.on('image:convert', (data) => {
        const jobId = uuidv4();
        const job = new ImageJob(jobId, 'convert', data.inputPath, data.options);
        jobs.set(jobId, job);
        jobQueue.push(job);
        socket.emit('job:created', job.toJSON());
        processQueue(io);
    });

    socket.on('image:thumbnail', (data) => {
        const jobId = uuidv4();
        const job = new ImageJob(jobId, 'thumbnail', data.inputPath, data.options);
        jobs.set(jobId, job);
        jobQueue.push(job);
        socket.emit('job:created', job.toJSON());
        processQueue(io);
    });

    socket.on('image:optimize', (data) => {
        const jobId = uuidv4();
        const job = new ImageJob(jobId, 'optimize', data.inputPath, data.options);
        jobs.set(jobId, job);
        jobQueue.push(job);
        socket.emit('job:created', job.toJSON());
        processQueue(io);
    });

    socket.on('image:batch', (data) => {
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

// Start server
server.listen(PORT, HOST, () => {
    console.log(`🖼️  HarmonySync Image Service listening on ${HOST}:${PORT}`);
    console.log(`📊 Process ID: ${process.pid}`);
    console.log(`💾 Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
    console.log(`⚙️  Max concurrent jobs: ${MAX_CONCURRENT_JOBS}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
