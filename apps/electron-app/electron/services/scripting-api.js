"use strict";
/**
 * HarmonySync Scripting API
 * Safe API wrapper for user scripts with comprehensive service access
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScriptingAPIService = void 0;
exports.createHarmonySyncAPI = createHarmonySyncAPI;
exports.getScriptingAPIService = getScriptingAPIService;
const services_1 = require("../types/services");
// ==================== Scripting API Service ====================
/**
 * ScriptingAPIService - Creates safe API context for user scripts
 * Extends BaseElectronService for consistent service behavior
 */
class ScriptingAPIService extends services_1.BaseElectronService {
    constructor() {
        super(...arguments);
        this.serviceName = 'ScriptingAPIService';
        this.services = {};
    }
    /**
     * Initialize the scripting API service
     */
    async onInitialize() {
        this.log('info', 'Scripting API service initialized');
    }
    /**
     * Clean up resources
     */
    onDispose() {
        this.services = {};
    }
    /**
     * Set service references for the API
     */
    setServices(services) {
        this.services = services;
        this.log('info', 'Service references updated');
    }
    /**
     * Create the HarmonySync API object for scripts
     */
    createHarmonySyncAPI() {
        this.ensureInitialized();
        const { displayService, audioService, videoService, windowService, macroService, imageService, textService, schedulerService, midiManager, mainWindow, audienceWindow, confidenceWindow, lowerThirdsWindow } = this.services;
        return {
            /**
             * Display API - Control content display across windows
             */
            display: {
                /**
                 * Show a slide on displays
                 */
                async showSlide(content) {
                    if (!content || typeof content !== 'object') {
                        throw new Error('Content must be an object');
                    }
                    if (displayService && audienceWindow && confidenceWindow && lowerThirdsWindow) {
                        await displayService.displaySlide(audienceWindow(), confidenceWindow(), lowerThirdsWindow(), content);
                    }
                },
                /**
                 * Show a video slide
                 */
                async showVideo(videoPath, options = {}) {
                    if (!videoPath || typeof videoPath !== 'string') {
                        throw new Error('Video path must be a string');
                    }
                    if (displayService && audienceWindow && confidenceWindow && lowerThirdsWindow) {
                        await displayService.displayVideoSlide(audienceWindow(), confidenceWindow(), lowerThirdsWindow(), videoPath, options);
                    }
                },
                /**
                 * Show black screen on all displays
                 */
                async blackScreen() {
                    if (displayService && audienceWindow && confidenceWindow && lowerThirdsWindow) {
                        await displayService.displayBlackScreen(audienceWindow(), confidenceWindow(), lowerThirdsWindow());
                    }
                },
                /**
                 * Clear all displays
                 */
                async clearAll() {
                    if (displayService && audienceWindow && confidenceWindow && lowerThirdsWindow) {
                        await displayService.clearAllDisplays(audienceWindow(), confidenceWindow(), lowerThirdsWindow());
                    }
                },
                /**
                 * Update lower thirds text
                 */
                async updateLowerThirds(text) {
                    if (typeof text !== 'string') {
                        throw new Error('Text must be a string');
                    }
                    if (displayService && lowerThirdsWindow) {
                        await displayService.updateLowerThirds(lowerThirdsWindow(), text);
                    }
                },
                /**
                 * Send custom message to a specific display
                 */
                async sendToDisplay(windowName, message) {
                    const windowMap = {
                        audience: audienceWindow ? audienceWindow() : null,
                        confidence: confidenceWindow ? confidenceWindow() : null,
                        lowerThirds: lowerThirdsWindow ? lowerThirdsWindow() : null
                    };
                    const window = windowMap[windowName];
                    if (!window) {
                        throw new Error(`Unknown window: ${windowName}`);
                    }
                    if (displayService) {
                        await displayService.sendToDisplay(window, message);
                    }
                }
            },
            /**
             * Audio API - Control audio playback and processing
             */
            audio: {
                /**
                 * Convert audio to OGG format
                 */
                async convertToOgg(inputPath, outputPath) {
                    if (audioService) {
                        return await audioService.convertToOgg(inputPath, outputPath);
                    }
                    throw new Error('Audio service not available');
                },
                /**
                 * Transpose audio
                 */
                async transpose(inputPath, outputPath, semitones) {
                    if (audioService) {
                        return await audioService.transposeAudio(inputPath, outputPath, semitones);
                    }
                    throw new Error('Audio service not available');
                },
                /**
                 * Get audio metadata
                 */
                async getMetadata(audioPath) {
                    if (audioService) {
                        return await audioService.getAudioMetadata(audioPath);
                    }
                    throw new Error('Audio service not available');
                }
            },
            /**
             * Video API - Control video operations
             */
            video: {
                /**
                 * Get video metadata
                 */
                async getMetadata(videoPath) {
                    if (videoService) {
                        return await videoService.getVideoMetadata(videoPath);
                    }
                    throw new Error('Video service not available');
                },
                /**
                 * Generate video thumbnail
                 */
                async generateThumbnail(videoPath, outputPath, options = {}) {
                    if (videoService) {
                        return await videoService.generateThumbnail(videoPath, outputPath, options);
                    }
                    throw new Error('Video service not available');
                }
            },
            /**
             * Image API - Control image operations
             */
            image: {
                /**
                 * Get image metadata
                 */
                async getMetadata(imagePath) {
                    if (imageService) {
                        return await imageService.getImageMetadata(imagePath);
                    }
                    throw new Error('Image service not available');
                },
                /**
                 * Generate image thumbnail
                 */
                async generateThumbnail(imagePath, outputPath, options = {}) {
                    if (imageService) {
                        return await imageService.generateThumbnail(imagePath, outputPath, options);
                    }
                    throw new Error('Image service not available');
                },
                /**
                 * Resize image
                 */
                async resize(imagePath, outputPath, options) {
                    if (imageService) {
                        return await imageService.resizeImage(imagePath, outputPath, options);
                    }
                    throw new Error('Image service not available');
                }
            },
            /**
             * Text API - Control text operations
             */
            text: {
                /**
                 * Generate CSS gradient background
                 */
                generateGradient(options) {
                    if (textService) {
                        return textService.generateAnimatedGradientCSS(options);
                    }
                    throw new Error('Text service not available');
                },
                /**
                 * Format lyrics
                 */
                formatLyrics(lyrics) {
                    if (textService) {
                        return textService.formatLyrics(lyrics);
                    }
                    throw new Error('Text service not available');
                },
                /**
                 * Split lyrics into slides
                 */
                splitLyrics(lyrics, options = {}) {
                    if (textService) {
                        return textService.splitLyricsIntoSlides(lyrics, options);
                    }
                    throw new Error('Text service not available');
                }
            },
            /**
             * Window API - Control window visibility and behavior
             */
            window: {
                /**
                 * Show a window
                 */
                async show(windowName) {
                    const windowMap = {
                        audience: async () => {
                            if (windowService && audienceWindow) {
                                await windowService.showAudience(audienceWindow());
                            }
                        },
                        confidence: async () => {
                            if (windowService && confidenceWindow) {
                                await windowService.showConfidence(confidenceWindow());
                            }
                        },
                        lowerThirds: async () => {
                            if (windowService && lowerThirdsWindow) {
                                await windowService.showLowerThirds(lowerThirdsWindow());
                            }
                        },
                        main: async () => {
                            if (windowService && mainWindow) {
                                await windowService.focusWindow(mainWindow());
                            }
                        }
                    };
                    const action = windowMap[windowName];
                    if (!action) {
                        throw new Error(`Unknown window: ${windowName}`);
                    }
                    await action();
                },
                /**
                 * Hide a window
                 */
                async hide(windowName) {
                    const windowMap = {
                        audience: async () => {
                            if (windowService && audienceWindow) {
                                await windowService.hideAudience(audienceWindow());
                            }
                        },
                        confidence: async () => {
                            if (windowService && confidenceWindow) {
                                await windowService.hideConfidence(confidenceWindow());
                            }
                        },
                        lowerThirds: async () => {
                            if (windowService && lowerThirdsWindow) {
                                await windowService.hideLowerThirds(lowerThirdsWindow());
                            }
                        }
                    };
                    const action = windowMap[windowName];
                    if (!action) {
                        throw new Error(`Unknown window: ${windowName}`);
                    }
                    await action();
                },
                /**
                 * Toggle window visibility
                 */
                async toggle(windowName) {
                    const windowMap = {
                        audience: async () => {
                            if (windowService && audienceWindow) {
                                await windowService.toggleAudience(audienceWindow());
                            }
                        },
                        confidence: async () => {
                            if (windowService && confidenceWindow) {
                                await windowService.toggleConfidence(confidenceWindow());
                            }
                        },
                        lowerThirds: async () => {
                            if (windowService && lowerThirdsWindow) {
                                await windowService.toggleLowerThirds(lowerThirdsWindow());
                            }
                        }
                    };
                    const action = windowMap[windowName];
                    if (!action) {
                        throw new Error(`Unknown window: ${windowName}`);
                    }
                    await action();
                },
                /**
                 * Check if window is visible
                 */
                isVisible(windowName) {
                    const windowMap = {
                        audience: () => {
                            if (windowService && audienceWindow) {
                                return windowService.isAudienceVisible(audienceWindow());
                            }
                            return false;
                        },
                        confidence: () => {
                            if (windowService && confidenceWindow) {
                                return windowService.isConfidenceVisible(confidenceWindow());
                            }
                            return false;
                        },
                        lowerThirds: () => {
                            if (windowService && lowerThirdsWindow) {
                                return windowService.isLowerThirdsVisible(lowerThirdsWindow());
                            }
                            return false;
                        }
                    };
                    const action = windowMap[windowName];
                    if (!action) {
                        throw new Error(`Unknown window: ${windowName}`);
                    }
                    return action();
                }
            },
            /**
             * MIDI API - Control MIDI output
             */
            midi: {
                /**
                 * Send MIDI note
                 */
                async sendNote(note, velocity = 127, duration = 100) {
                    if (typeof note !== 'number' || note < 0 || note > 127) {
                        throw new Error('Note must be a number between 0 and 127');
                    }
                    if (typeof velocity !== 'number' || velocity < 0 || velocity > 127) {
                        throw new Error('Velocity must be a number between 0 and 127');
                    }
                    // Send MIDI note through MIDI manager
                    if (midiManager && midiManager.sendNote) {
                        await midiManager.sendNote(note, velocity, duration);
                    }
                    else {
                        console.warn('MIDI manager not available');
                    }
                },
                /**
                 * Send MIDI control change
                 */
                async sendCC(controller, value) {
                    if (typeof controller !== 'number' || controller < 0 || controller > 127) {
                        throw new Error('Controller must be a number between 0 and 127');
                    }
                    if (typeof value !== 'number' || value < 0 || value > 127) {
                        throw new Error('Value must be a number between 0 and 127');
                    }
                    if (midiManager && midiManager.sendCC) {
                        await midiManager.sendCC(controller, value);
                    }
                    else {
                        console.warn('MIDI manager not available');
                    }
                }
            },
            /**
             * Macro API - Execute macros
             */
            macro: {
                /**
                 * Execute a macro by ID
                 */
                async execute(macroId, options = {}) {
                    if (macroService) {
                        const { app } = require('electron');
                        await macroService.executeMacro(app, macroId, macroId, options);
                    }
                    else {
                        throw new Error('Macro service not available');
                    }
                }
            },
            /**
             * Scheduler API - Manage scheduled events
             */
            scheduler: {
                /**
                 * Get today's events
                 */
                async getTodayEvents(db) {
                    if (schedulerService) {
                        return await schedulerService.getTodayEvents(db);
                    }
                    throw new Error('Scheduler service not available');
                },
                /**
                 * Get upcoming events
                 */
                async getUpcomingEvents(db, hours = 24) {
                    if (schedulerService) {
                        return await schedulerService.getUpcomingEvents(db, hours);
                    }
                    throw new Error('Scheduler service not available');
                }
            },
            /**
             * Utility functions
             */
            utils: {
                /**
                 * Wait for a specified duration
                 */
                async wait(ms) {
                    return new Promise(resolve => setTimeout(resolve, ms));
                },
                /**
                 * Get current timestamp
                 */
                now() {
                    return Date.now();
                },
                /**
                 * Format date
                 */
                formatDate(date) {
                    const d = new Date(date);
                    return d.toISOString();
                }
            },
            /**
             * Debug API - Debugging tools for script development
             */
            debug: {
                /**
                 * Log a debug message
                 */
                log(...args) {
                    console.log('[DEBUG]', ...args);
                },
                /**
                 * Inspect a variable
                 */
                inspect(variable, label = 'Variable') {
                    console.log(`[DEBUG] ${label}:`, JSON.stringify(variable, null, 2));
                    return variable;
                },
                /**
                 * Start timing an operation
                 */
                time(label) {
                    console.time(`[DEBUG] ${label}`);
                },
                /**
                 * End timing an operation
                 */
                timeEnd(label) {
                    console.timeEnd(`[DEBUG] ${label}`);
                },
                /**
                 * Breakpoint marker (logs current location)
                 */
                breakpoint() {
                    const stack = new Error().stack;
                    console.log('[DEBUG] Breakpoint reached:', stack);
                }
            }
        };
    }
}
exports.ScriptingAPIService = ScriptingAPIService;
// ==================== Standalone Function (Legacy Support) ====================
/**
 * Create HarmonySync API (standalone function for backwards compatibility)
 * @deprecated Use ScriptingAPIService class instead
 */
function createHarmonySyncAPI(services) {
    const apiService = new ScriptingAPIService();
    apiService.setServices(services);
    return apiService.createHarmonySyncAPI();
}
// ==================== Default Export ====================
/**
 * Create and export a singleton instance
 */
let scriptingAPIServiceInstance = null;
function getScriptingAPIService() {
    if (!scriptingAPIServiceInstance) {
        scriptingAPIServiceInstance = new ScriptingAPIService();
    }
    return scriptingAPIServiceInstance;
}
exports.default = ScriptingAPIService;
