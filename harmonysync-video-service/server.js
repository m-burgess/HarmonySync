const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration
const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 3002;
const SHUTDOWN_TOKEN = process.env.SHUTDOWN_TOKEN || null;

// Job management
const jobs = new Map();

class VideoJob {
    constructor(id, type, inputPath, options = {}) {
        this.id = id;
        this.type = type; // 'transcode', 'thumbnail', 'metadata'
        this.inputPath = inputPath;
        this.options = options;
        this.status = 'pending'; // pending, processing, completed, error, cancelled
        this.progress = 0;
        this.result = null;
        this.error = null;
        this.startTime = Date.now();
        this.endTime = null;
        this.ffmpegCommand = null;
    }

    cancel() {
        if (this.ffmpegCommand) {
            this.ffmpegCommand.kill('SIGKILL');
        }
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

// Helper function to parse FFmpeg timemark to seconds
function parseTimemark(timemark) {
    if (typeof timemark === 'number') return timemark;
    if (typeof timemark !== 'string') return 0;
    
    const parts = timemark.split(':');
    let seconds = 0;
    
    if (parts.length === 3) {
        seconds = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
        seconds = parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
    } else {
        seconds = parseFloat(timemark);
    }
    
    return seconds;
}

// Video processing functions
async function transcodeVideo(job, io) {
    return new Promise((resolve, reject) => {
        const { inputPath, options = {} } = job;
        const outputDir = options.outputDir || path.dirname(inputPath);
        const fileName = path.basename(inputPath, path.extname(inputPath));
        const outputPath = path.join(outputDir, `${fileName}_transcoded.mp4`);

        // Check if output already exists
        if (fs.existsSync(outputPath) && !options.force) {
            job.status = 'completed';
            job.result = { outputPath };
            job.endTime = Date.now();
            resolve(outputPath);
            return;
        }

        fs.ensureDirSync(outputDir);

        // Get video duration first
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
            if (err) {
                job.status = 'error';
                job.error = `Failed to probe video: ${err.message}`;
                job.endTime = Date.now();
                io.emit('job:error', job.toJSON());
                reject(err);
                return;
            }

            const totalDuration = metadata.format.duration || 0;
            job.status = 'processing';

            const command = ffmpeg(inputPath)
                .videoCodec(options.videoCodec || 'libx264')
                .audioCodec(options.audioCodec || 'aac')
                .audioBitrate(options.audioBitrate || '128k')
                .videoFilters('format=yuv420p')
                .outputOptions([
                    `-preset ${options.preset || 'medium'}`,
                    `-crf ${options.crf || 23}`,
                    '-movflags +faststart'
                ])
                .on('progress', (progress) => {
                    if (totalDuration > 0) {
                        const currentTime = parseTimemark(progress.timemark);
                        job.progress = Math.min(100, Math.round((currentTime / totalDuration) * 100));
                        io.emit('job:progress', job.toJSON());
                    }
                })
                .on('end', () => {
                    job.status = 'completed';
                    job.progress = 100;
                    job.result = { outputPath };
                    job.endTime = Date.now();
                    io.emit('job:complete', job.toJSON());
                    console.log(`✅ Transcoding complete: ${outputPath}`);
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    if (job.status === 'cancelled') {
                        console.log(`🛑 Job cancelled: ${job.id}`);
                        resolve(null);
                    } else {
                        job.status = 'error';
                        job.error = err.message;
                        job.endTime = Date.now();
                        io.emit('job:error', job.toJSON());
                        console.error(`❌ Transcoding error: ${err.message}`);
                        reject(err);
                    }
                })
                .save(outputPath);

            job.ffmpegCommand = command;
        });
    });
}

async function generateThumbnail(job, io) {
    return new Promise((resolve, reject) => {
        const { inputPath, options = {} } = job;
        const outputDir = options.outputDir || path.dirname(inputPath);
        const timestamp = options.timestamp || 3;
        const size = options.size || '320x240';
        const thumbnailName = options.filename || `${uuidv4()}.png`;
        const thumbnailPath = path.join(outputDir, thumbnailName);

        fs.ensureDirSync(outputDir);

        job.status = 'processing';

        const command = ffmpeg(inputPath)
            .screenshots({
                timestamps: [timestamp],
                filename: thumbnailName,
                folder: outputDir,
                size: size
            })
            .on('end', () => {
                job.status = 'completed';
                job.progress = 100;
                job.result = { thumbnailPath };
                job.endTime = Date.now();
                io.emit('job:complete', job.toJSON());
                console.log(`✅ Thumbnail generated: ${thumbnailPath}`);
                resolve(thumbnailPath);
            })
            .on('error', (err) => {
                if (job.status === 'cancelled') {
                    console.log(`🛑 Job cancelled: ${job.id}`);
                    resolve(null);
                } else {
                    job.status = 'error';
                    job.error = err.message;
                    job.endTime = Date.now();
                    io.emit('job:error', job.toJSON());
                    console.error(`❌ Thumbnail error: ${err.message}`);
                    reject(err);
                }
            });

        job.ffmpegCommand = command;
    });
}

async function extractMetadata(job, io) {
    return new Promise((resolve, reject) => {
        const { inputPath } = job;
        
        job.status = 'processing';

        ffmpeg.ffprobe(inputPath, (err, metadata) => {
            if (err) {
                job.status = 'error';
                job.error = `Failed to extract metadata: ${err.message}`;
                job.endTime = Date.now();
                io.emit('job:error', job.toJSON());
                reject(err);
                return;
            }

            const videoStream = metadata.streams.find(s => s.codec_type === 'video');
            const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

            const result = {
                duration: Math.round(metadata.format.duration || 0),
                width: videoStream?.width,
                height: videoStream?.height,
                videoCodec: videoStream?.codec_name,
                audioCodec: audioStream?.codec_name,
                format: metadata.format.format_name,
                bitRate: metadata.format.bit_rate,
                size: metadata.format.size,
                fps: videoStream?.r_frame_rate
            };

            job.status = 'completed';
            job.progress = 100;
            job.result = result;
            job.endTime = Date.now();
            io.emit('job:complete', job.toJSON());
            console.log(`✅ Metadata extracted for: ${inputPath}`);
            resolve(result);
        });
    });
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
        service: 'harmonysync-video-service',
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        activeJobs: jobs.size
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

app.post('/api/shutdown', (req, res) => {
    const token = req.headers['x-shutdown-token'] || req.headers.authorization?.replace('Bearer ', '');
    
    if (SHUTDOWN_TOKEN && token !== SHUTDOWN_TOKEN) {
        return res.status(403).json({ error: 'Invalid shutdown token' });
    }

    console.log('🛑 Shutdown requested');
    res.json({ message: 'Shutting down...' });
    
    // Cancel all active jobs
    for (const job of jobs.values()) {
        if (job.status === 'processing') {
            job.cancel();
        }
    }

    setTimeout(() => {
        process.exit(0);
    }, 1000);
});

// Socket.io event handlers
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('video:transcode', async (data) => {
        const jobId = uuidv4();
        const job = new VideoJob(jobId, 'transcode', data.inputPath, data.options);
        jobs.set(jobId, job);

        socket.emit('job:created', job.toJSON());

        try {
            await transcodeVideo(job, io);
        } catch (error) {
            console.error('Transcode error:', error);
        } finally {
            // Clean up job after 5 minutes
            setTimeout(() => jobs.delete(jobId), 5 * 60 * 1000);
        }
    });

    socket.on('video:thumbnail', async (data) => {
        const jobId = uuidv4();
        const job = new VideoJob(jobId, 'thumbnail', data.inputPath, data.options);
        jobs.set(jobId, job);

        socket.emit('job:created', job.toJSON());

        try {
            await generateThumbnail(job, io);
        } catch (error) {
            console.error('Thumbnail error:', error);
        } finally {
            setTimeout(() => jobs.delete(jobId), 5 * 60 * 1000);
        }
    });

    socket.on('video:metadata', async (data) => {
        const jobId = uuidv4();
        const job = new VideoJob(jobId, 'metadata', data.inputPath);
        jobs.set(jobId, job);

        socket.emit('job:created', job.toJSON());

        try {
            await extractMetadata(job, io);
        } catch (error) {
            console.error('Metadata error:', error);
        } finally {
            setTimeout(() => jobs.delete(jobId), 5 * 60 * 1000);
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

// Start server
server.listen(PORT, HOST, () => {
    console.log(`🎬 HarmonySync Video Service listening on ${HOST}:${PORT}`);
    console.log(`📊 Process ID: ${process.pid}`);
    console.log(`💾 Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
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
