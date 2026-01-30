import express, { Request, Response, Application } from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import ffmpeg, { FfmpegCommand } from 'fluent-ffmpeg';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const HOST: string = process.env.HOST || '127.0.0.1';
const PORT: number = parseInt(process.env.PORT || '3002', 10);
const SHUTDOWN_TOKEN: string | null = process.env.SHUTDOWN_TOKEN || null;

// Job management
const jobs = new Map<string, VideoJob>();

// Type definitions
type JobType = 'transcode' | 'thumbnail' | 'metadata';
type JobStatus = 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';

interface TranscodeOptions {
    outputDir?: string;
    videoCodec?: string;
    audioCodec?: string;
    audioBitrate?: string;
    preset?: string;
    crf?: number;
    force?: boolean;
}

interface ThumbnailOptions {
    outputDir?: string;
    timestamp?: number;
    size?: string;
    filename?: string;
}

interface VideoMetadata {
    duration: number;
    width?: number;
    height?: number;
    videoCodec?: string;
    audioCodec?: string;
    format?: string;
    bitRate?: number;
    size?: number;
    fps?: string;
}

interface ProgressInfo {
    frames?: number;
    currentFps?: number;
    currentKbps?: number;
    targetSize?: number;
    timemark?: string;
    percent?: number;
}

class VideoJob {
    public id: string;
    public type: JobType;
    public inputPath: string;
    public options: TranscodeOptions | ThumbnailOptions | Record<string, never>;
    public status: JobStatus;
    public progress: number;
    public result: any;
    public error: string | null;
    public startTime: number;
    public endTime: number | null;
    public ffmpegCommand: FfmpegCommand | null;

    constructor(
        id: string,
        type: JobType,
        inputPath: string,
        options: TranscodeOptions | ThumbnailOptions | Record<string, never> = {}
    ) {
        this.id = id;
        this.type = type;
        this.inputPath = inputPath;
        this.options = options;
        this.status = 'pending';
        this.progress = 0;
        this.result = null;
        this.error = null;
        this.startTime = Date.now();
        this.endTime = null;
        this.ffmpegCommand = null;
    }

    cancel(): void {
        if (this.ffmpegCommand) {
            this.ffmpegCommand.kill('SIGKILL');
        }
        this.status = 'cancelled';
        this.endTime = Date.now();
    }

    toJSON(): object {
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
function parseTimemark(timemark: string | number | undefined): number {
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
async function transcodeVideo(job: VideoJob, io: SocketIOServer): Promise<string | null> {
    return new Promise((resolve, reject) => {
        const { inputPath, options = {} } = job;
        const transcodeOptions = options as TranscodeOptions;
        const outputDir = transcodeOptions.outputDir || path.dirname(inputPath);
        const fileName = path.basename(inputPath, path.extname(inputPath));
        const outputPath = path.join(outputDir, `${fileName}_transcoded.mp4`);

        // Check if output already exists
        if (fs.existsSync(outputPath) && !transcodeOptions.force) {
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
                .videoCodec(transcodeOptions.videoCodec || 'libx264')
                .audioCodec(transcodeOptions.audioCodec || 'aac')
                .audioBitrate(transcodeOptions.audioBitrate || '128k')
                .videoFilters('format=yuv420p')
                .outputOptions([
                    `-preset ${transcodeOptions.preset || 'medium'}`,
                    `-crf ${transcodeOptions.crf || 23}`,
                    '-movflags +faststart'
                ])
                .on('progress', (progress: ProgressInfo) => {
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
                .on('error', (err: Error) => {
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

async function generateThumbnail(job: VideoJob, io: SocketIOServer): Promise<string | null> {
    return new Promise((resolve, reject) => {
        const { inputPath, options = {} } = job;
        const thumbnailOptions = options as ThumbnailOptions;
        const outputDir = thumbnailOptions.outputDir || path.dirname(inputPath);
        const timestamp = thumbnailOptions.timestamp || 3;
        const size = thumbnailOptions.size || '320x240';
        const thumbnailName = thumbnailOptions.filename || `${uuidv4()}.png`;
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
            .on('error', (err: Error) => {
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

async function extractMetadata(job: VideoJob, io: SocketIOServer): Promise<VideoMetadata> {
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

            const result: VideoMetadata = {
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
        service: 'harmonysync-video-service',
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        activeJobs: jobs.size
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

app.post('/api/shutdown', (req: Request, res: Response): void => {
    const token = req.headers['x-shutdown-token'] as string | undefined || 
                  (req.headers.authorization as string | undefined)?.replace('Bearer ', '');
    
    if (SHUTDOWN_TOKEN && token !== SHUTDOWN_TOKEN) {
        res.status(403).json({ error: 'Invalid shutdown token' });
        return;
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
io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('video:transcode', async (data: { inputPath: string; options?: TranscodeOptions }) => {
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

    socket.on('video:thumbnail', async (data: { inputPath: string; options?: ThumbnailOptions }) => {
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

    socket.on('video:metadata', async (data: { inputPath: string }) => {
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
