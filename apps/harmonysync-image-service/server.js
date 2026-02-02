"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var http_1 = require("http");
var socket_io_1 = require("socket.io");
var cors_1 = require("cors");
var sharp_1 = require("sharp");
var fs_extra_1 = require("fs-extra");
var path_1 = require("path");
var uuid_1 = require("uuid");
// Configuration
var HOST = process.env.HOST || '127.0.0.1';
var PORT = parseInt(process.env.PORT || '3003', 10);
var SHUTDOWN_TOKEN = process.env.SHUTDOWN_TOKEN || null;
var MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || '3', 10);
// Job management
var jobs = new Map();
var jobQueue = [];
var activeJobCount = 0;
var ImageJob = /** @class */ (function () {
    function ImageJob(id, type, inputPath, options) {
        if (options === void 0) { options = {}; }
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
    ImageJob.prototype.cancel = function () {
        this.status = 'cancelled';
        this.endTime = Date.now();
    };
    ImageJob.prototype.toJSON = function () {
        return {
            id: this.id,
            type: this.type,
            status: this.status,
            progress: this.progress,
            result: this.result,
            error: this.error,
            duration: this.endTime ? this.endTime - this.startTime : Date.now() - this.startTime
        };
    };
    return ImageJob;
}());
// Process queue
function processQueue(io) {
    return __awaiter(this, void 0, void 0, function () {
        var job, _a, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (activeJobCount >= MAX_CONCURRENT_JOBS || jobQueue.length === 0) {
                        return [2 /*return*/];
                    }
                    job = jobQueue.shift();
                    if (!job || job.status === 'cancelled') {
                        processQueue(io);
                        return [2 /*return*/];
                    }
                    activeJobCount++;
                    job.status = 'processing';
                    io.emit('job:progress', job.toJSON());
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 13, 14, 15]);
                    _a = job.type;
                    switch (_a) {
                        case 'resize': return [3 /*break*/, 2];
                        case 'convert': return [3 /*break*/, 4];
                        case 'thumbnail': return [3 /*break*/, 6];
                        case 'optimize': return [3 /*break*/, 8];
                        case 'batch': return [3 /*break*/, 10];
                    }
                    return [3 /*break*/, 12];
                case 2: return [4 /*yield*/, resizeImage(job, io)];
                case 3:
                    _b.sent();
                    return [3 /*break*/, 12];
                case 4: return [4 /*yield*/, convertFormat(job, io)];
                case 5:
                    _b.sent();
                    return [3 /*break*/, 12];
                case 6: return [4 /*yield*/, generateThumbnail(job, io)];
                case 7:
                    _b.sent();
                    return [3 /*break*/, 12];
                case 8: return [4 /*yield*/, optimizeForWeb(job, io)];
                case 9:
                    _b.sent();
                    return [3 /*break*/, 12];
                case 10: return [4 /*yield*/, processBatch(job, io)];
                case 11:
                    _b.sent();
                    return [3 /*break*/, 12];
                case 12: return [3 /*break*/, 15];
                case 13:
                    error_1 = _b.sent();
                    console.error("Job ".concat(job.id, " error:"), error_1);
                    return [3 /*break*/, 15];
                case 14:
                    activeJobCount--;
                    // Clean up job after 5 minutes
                    setTimeout(function () { return jobs.delete(job.id); }, 5 * 60 * 1000);
                    // Process next job in queue
                    processQueue(io);
                    return [7 /*endfinally*/];
                case 15: return [2 /*return*/];
            }
        });
    });
}
// Image processing functions
function resizeImage(job, io) {
    return __awaiter(this, void 0, void 0, function () {
        var inputPath, _a, options, outputDir, fileName, ext, outputPath, resizeOptions, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    inputPath = job.inputPath, _a = job.options, options = _a === void 0 ? {} : _a;
                    if (!inputPath) {
                        throw new Error('Input path is required for resize operation');
                    }
                    outputDir = options.outputDir || path_1.default.dirname(inputPath);
                    fileName = path_1.default.basename(inputPath, path_1.default.extname(inputPath));
                    ext = path_1.default.extname(inputPath);
                    outputPath = path_1.default.join(outputDir, "".concat(fileName, "_").concat(options.width, "x").concat(options.height || 'auto').concat(ext));
                    return [4 /*yield*/, fs_extra_1.default.ensureDir(outputDir)];
                case 1:
                    _b.sent();
                    resizeOptions = {
                        width: options.width,
                        fit: options.fit || 'contain',
                        position: options.position || 'center',
                        background: options.background || { r: 0, g: 0, b: 0, alpha: 0 }
                    };
                    if (options.height) {
                        resizeOptions.height = options.height;
                    }
                    return [4 /*yield*/, (0, sharp_1.default)(inputPath)
                            .resize(resizeOptions)
                            .toFile(outputPath)];
                case 2:
                    _b.sent();
                    job.status = 'completed';
                    job.progress = 100;
                    job.result = { outputPath: outputPath };
                    job.endTime = Date.now();
                    io.emit('job:complete', job.toJSON());
                    console.log("\u2705 Image resized: ".concat(outputPath));
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _b.sent();
                    job.status = 'error';
                    job.error = error_2 instanceof Error ? error_2.message : String(error_2);
                    job.endTime = Date.now();
                    io.emit('job:error', job.toJSON());
                    console.error("\u274C Resize error: ".concat(job.error));
                    throw error_2;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function convertFormat(job, io) {
    return __awaiter(this, void 0, void 0, function () {
        var inputPath, _a, options, outputDir, fileName, format, outputPath, pipeline, error_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    inputPath = job.inputPath, _a = job.options, options = _a === void 0 ? {} : _a;
                    if (!inputPath) {
                        throw new Error('Input path is required for convert operation');
                    }
                    outputDir = options.outputDir || path_1.default.dirname(inputPath);
                    fileName = path_1.default.basename(inputPath, path_1.default.extname(inputPath));
                    format = options.format || 'jpeg';
                    outputPath = path_1.default.join(outputDir, "".concat(fileName, ".").concat(format));
                    return [4 /*yield*/, fs_extra_1.default.ensureDir(outputDir)];
                case 1:
                    _b.sent();
                    pipeline = (0, sharp_1.default)(inputPath);
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
                            throw new Error("Unsupported format: ".concat(format));
                    }
                    return [4 /*yield*/, pipeline.toFile(outputPath)];
                case 2:
                    _b.sent();
                    job.status = 'completed';
                    job.progress = 100;
                    job.result = { outputPath: outputPath };
                    job.endTime = Date.now();
                    io.emit('job:complete', job.toJSON());
                    console.log("\u2705 Image converted to ".concat(format, ": ").concat(outputPath));
                    return [3 /*break*/, 4];
                case 3:
                    error_3 = _b.sent();
                    job.status = 'error';
                    job.error = error_3 instanceof Error ? error_3.message : String(error_3);
                    job.endTime = Date.now();
                    io.emit('job:error', job.toJSON());
                    console.error("\u274C Convert error: ".concat(job.error));
                    throw error_3;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function generateThumbnail(job, io) {
    return __awaiter(this, void 0, void 0, function () {
        var inputPath, _a, options, outputDir, width, height, thumbnailName, thumbnailPath, resizeOptions, error_4;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    inputPath = job.inputPath, _a = job.options, options = _a === void 0 ? {} : _a;
                    if (!inputPath) {
                        throw new Error('Input path is required for thumbnail operation');
                    }
                    outputDir = options.outputDir || path_1.default.dirname(inputPath);
                    width = options.width || 320;
                    height = options.height || null;
                    thumbnailName = options.filename || "thumb_".concat((0, uuid_1.v4)(), ".jpg");
                    thumbnailPath = path_1.default.join(outputDir, thumbnailName);
                    return [4 /*yield*/, fs_extra_1.default.ensureDir(outputDir)];
                case 1:
                    _b.sent();
                    resizeOptions = { width: width };
                    if (height) {
                        resizeOptions.height = height;
                        resizeOptions.fit = 'cover';
                    }
                    return [4 /*yield*/, (0, sharp_1.default)(inputPath)
                            .resize(resizeOptions)
                            .jpeg({ quality: 80 })
                            .toFile(thumbnailPath)];
                case 2:
                    _b.sent();
                    job.status = 'completed';
                    job.progress = 100;
                    job.result = { thumbnailPath: thumbnailPath };
                    job.endTime = Date.now();
                    io.emit('job:complete', job.toJSON());
                    console.log("\u2705 Thumbnail generated: ".concat(thumbnailPath));
                    return [3 /*break*/, 4];
                case 3:
                    error_4 = _b.sent();
                    job.status = 'error';
                    job.error = error_4 instanceof Error ? error_4.message : String(error_4);
                    job.endTime = Date.now();
                    io.emit('job:error', job.toJSON());
                    console.error("\u274C Thumbnail error: ".concat(job.error));
                    throw error_4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function optimizeForWeb(job, io) {
    return __awaiter(this, void 0, void 0, function () {
        var inputPath, _a, options, outputDir, fileName, outputPath, error_5;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    inputPath = job.inputPath, _a = job.options, options = _a === void 0 ? {} : _a;
                    if (!inputPath) {
                        throw new Error('Input path is required for optimize operation');
                    }
                    outputDir = options.outputDir || path_1.default.dirname(inputPath);
                    fileName = path_1.default.basename(inputPath, path_1.default.extname(inputPath));
                    outputPath = path_1.default.join(outputDir, "".concat(fileName, "_optimized.jpg"));
                    return [4 /*yield*/, fs_extra_1.default.ensureDir(outputDir)];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, (0, sharp_1.default)(inputPath)
                            .resize({ width: options.maxWidth || 1920, withoutEnlargement: true })
                            .jpeg({ quality: options.quality || 85, progressive: true })
                            .toFile(outputPath)];
                case 2:
                    _b.sent();
                    job.status = 'completed';
                    job.progress = 100;
                    job.result = { outputPath: outputPath };
                    job.endTime = Date.now();
                    io.emit('job:complete', job.toJSON());
                    console.log("\u2705 Image optimized: ".concat(outputPath));
                    return [3 /*break*/, 4];
                case 3:
                    error_5 = _b.sent();
                    job.status = 'error';
                    job.error = error_5 instanceof Error ? error_5.message : String(error_5);
                    job.endTime = Date.now();
                    io.emit('job:error', job.toJSON());
                    console.error("\u274C Optimize error: ".concat(job.error));
                    throw error_5;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function processBatch(job, io) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, options, images, operation, results, i, imageOptions, subJob, _b, error_6, error_7;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 16, , 17]);
                    _a = job.options, options = _a === void 0 ? {} : _a;
                    images = options.images || [];
                    operation = options.operation || 'resize';
                    results = [];
                    i = 0;
                    _c.label = 1;
                case 1:
                    if (!(i < images.length)) return [3 /*break*/, 15];
                    if (job.status === 'cancelled') {
                        return [3 /*break*/, 15];
                    }
                    imageOptions = __assign(__assign({}, options), { inputPath: images[i] });
                    subJob = new ImageJob((0, uuid_1.v4)(), operation, images[i], imageOptions);
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 12, , 13]);
                    _b = operation;
                    switch (_b) {
                        case 'resize': return [3 /*break*/, 3];
                        case 'convert': return [3 /*break*/, 5];
                        case 'thumbnail': return [3 /*break*/, 7];
                        case 'optimize': return [3 /*break*/, 9];
                    }
                    return [3 /*break*/, 11];
                case 3: return [4 /*yield*/, resizeImage(subJob, io)];
                case 4:
                    _c.sent();
                    return [3 /*break*/, 11];
                case 5: return [4 /*yield*/, convertFormat(subJob, io)];
                case 6:
                    _c.sent();
                    return [3 /*break*/, 11];
                case 7: return [4 /*yield*/, generateThumbnail(subJob, io)];
                case 8:
                    _c.sent();
                    return [3 /*break*/, 11];
                case 9: return [4 /*yield*/, optimizeForWeb(subJob, io)];
                case 10:
                    _c.sent();
                    return [3 /*break*/, 11];
                case 11:
                    results.push({ path: images[i], result: subJob.result, success: true });
                    return [3 /*break*/, 13];
                case 12:
                    error_6 = _c.sent();
                    results.push({
                        path: images[i],
                        error: error_6 instanceof Error ? error_6.message : String(error_6),
                        success: false
                    });
                    return [3 /*break*/, 13];
                case 13:
                    job.progress = Math.round(((i + 1) / images.length) * 100);
                    io.emit('job:progress', job.toJSON());
                    _c.label = 14;
                case 14:
                    i++;
                    return [3 /*break*/, 1];
                case 15:
                    job.status = 'completed';
                    job.progress = 100;
                    job.result = { results: results, total: images.length, succeeded: results.filter(function (r) { return r.success; }).length };
                    job.endTime = Date.now();
                    io.emit('job:complete', job.toJSON());
                    console.log("\u2705 Batch processed: ".concat(results.filter(function (r) { return r.success; }).length, "/").concat(images.length, " succeeded"));
                    return [3 /*break*/, 17];
                case 16:
                    error_7 = _c.sent();
                    job.status = 'error';
                    job.error = error_7 instanceof Error ? error_7.message : String(error_7);
                    job.endTime = Date.now();
                    io.emit('job:error', job.toJSON());
                    console.error("\u274C Batch error: ".concat(job.error));
                    throw error_7;
                case 17: return [2 /*return*/];
            }
        });
    });
}
// Initialize Express app
var app = (0, express_1.default)();
var server = http_1.default.createServer(app);
var io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// REST API endpoints
app.get('/api/health', function (req, res) {
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
app.get('/api/jobs/:id', function (req, res) {
    var job = jobs.get(req.params.id);
    if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
    }
    res.json(job.toJSON());
});
app.delete('/api/jobs/:id', function (req, res) {
    var job = jobs.get(req.params.id);
    if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
    }
    job.cancel();
    res.json({ message: 'Job cancelled', job: job.toJSON() });
});
app.get('/api/queue', function (req, res) {
    res.json({
        activeJobs: activeJobCount,
        queuedJobs: jobQueue.length,
        maxConcurrent: MAX_CONCURRENT_JOBS,
        queue: jobQueue.map(function (j) { return j.toJSON(); })
    });
});
app.post('/api/shutdown', function (req, res) {
    var token = req.headers['x-shutdown-token'] ||
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
    for (var _i = 0, _a = jobs.values(); _i < _a.length; _i++) {
        var job = _a[_i];
        if (job.status === 'processing' || job.status === 'queued') {
            job.cancel();
        }
    }
    jobQueue.length = 0;
    setTimeout(function () {
        process.exit(0);
    }, 1000);
});
// Socket.io event handlers
io.on('connection', function (socket) {
    console.log("\uD83D\uDD0C Client connected: ".concat(socket.id));
    socket.on('image:resize', function (data) {
        var jobId = (0, uuid_1.v4)();
        var job = new ImageJob(jobId, 'resize', data.inputPath, data.options);
        jobs.set(jobId, job);
        jobQueue.push(job);
        socket.emit('job:created', job.toJSON());
        processQueue(io);
    });
    socket.on('image:convert', function (data) {
        var jobId = (0, uuid_1.v4)();
        var job = new ImageJob(jobId, 'convert', data.inputPath, data.options);
        jobs.set(jobId, job);
        jobQueue.push(job);
        socket.emit('job:created', job.toJSON());
        processQueue(io);
    });
    socket.on('image:thumbnail', function (data) {
        var jobId = (0, uuid_1.v4)();
        var job = new ImageJob(jobId, 'thumbnail', data.inputPath, data.options);
        jobs.set(jobId, job);
        jobQueue.push(job);
        socket.emit('job:created', job.toJSON());
        processQueue(io);
    });
    socket.on('image:optimize', function (data) {
        var jobId = (0, uuid_1.v4)();
        var job = new ImageJob(jobId, 'optimize', data.inputPath, data.options);
        jobs.set(jobId, job);
        jobQueue.push(job);
        socket.emit('job:created', job.toJSON());
        processQueue(io);
    });
    socket.on('image:batch', function (data) {
        var jobId = (0, uuid_1.v4)();
        var job = new ImageJob(jobId, 'batch', null, data.options);
        jobs.set(jobId, job);
        jobQueue.push(job);
        socket.emit('job:created', job.toJSON());
        processQueue(io);
    });
    socket.on('disconnect', function () {
        console.log("\uD83D\uDD0C Client disconnected: ".concat(socket.id));
    });
});
// Start server
server.listen(PORT, HOST, function () {
    console.log("\uD83D\uDDBC\uFE0F  HarmonySync Image Service listening on ".concat(HOST, ":").concat(PORT));
    console.log("\uD83D\uDCCA Process ID: ".concat(process.pid));
    console.log("\uD83D\uDCBE Memory: ".concat(Math.round(process.memoryUsage().rss / 1024 / 1024), "MB"));
    console.log("\u2699\uFE0F  Max concurrent jobs: ".concat(MAX_CONCURRENT_JOBS));
});
// Graceful shutdown
process.on('SIGTERM', function () {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(function () {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
process.on('SIGINT', function () {
    console.log('🛑 SIGINT received, shutting down gracefully');
    server.close(function () {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
