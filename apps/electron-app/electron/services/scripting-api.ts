/**
 * HarmonySync Scripting API
 * Safe API wrapper for user scripts with comprehensive service access
 */

import { BrowserWindow } from 'electron';
import { BaseElectronService } from '@harmonysync/core';
import { SlideContent } from '@harmonysync/core';

// ==================== Type Definitions ====================

/**
 * Window accessor functions
 */
type WindowAccessor = () => BrowserWindow | null;

/**
 * Service references required for scripting API
 */
interface ScriptingAPIServices {
  displayService?: any;
  audioService?: any;
  videoService?: any;
  windowService?: any;
  macroService?: any;
  imageService?: any;
  textService?: any;
  schedulerService?: any;
  midiManager?: any;
  mainWindow?: WindowAccessor;
  audienceWindow?: WindowAccessor;
  confidenceWindow?: WindowAccessor;
  lowerThirdsWindow?: WindowAccessor;
}

/**
 * Display API interface
 */
interface DisplayAPI {
  showSlide(content: SlideContent): Promise<void>;
  showVideo(videoPath: string, options?: Record<string, any>): Promise<void>;
  blackScreen(): Promise<void>;
  clearAll(): Promise<void>;
  updateLowerThirds(text: string): Promise<void>;
  sendToDisplay(windowName: string, message: any): Promise<void>;
}

/**
 * Audio API interface
 */
interface AudioAPI {
  convertToOgg(inputPath: string, outputPath: string): Promise<any>;
  transpose(inputPath: string, outputPath: string, semitones: number): Promise<any>;
  getMetadata(audioPath: string): Promise<any>;
}

/**
 * Video API interface
 */
interface VideoAPI {
  getMetadata(videoPath: string): Promise<any>;
  generateThumbnail(videoPath: string, outputPath: string, options?: Record<string, any>): Promise<any>;
}

/**
 * Image API interface
 */
interface ImageAPI {
  getMetadata(imagePath: string): Promise<any>;
  generateThumbnail(imagePath: string, outputPath: string, options?: Record<string, any>): Promise<any>;
  resize(imagePath: string, outputPath: string, options: { width?: number; height?: number }): Promise<any>;
}

/**
 * Text API interface
 */
interface TextAPI {
  generateGradient(options: Record<string, any>): string;
  formatLyrics(lyrics: string): string;
  splitLyrics(lyrics: string, options?: Record<string, any>): string[];
}

/**
 * Window API interface
 */
interface WindowAPI {
  show(windowName: string): Promise<void>;
  hide(windowName: string): Promise<void>;
  toggle(windowName: string): Promise<void>;
  isVisible(windowName: string): boolean;
}

/**
 * MIDI API interface
 */
interface MIDIAPI {
  sendNote(note: number, velocity?: number, duration?: number): Promise<void>;
  sendCC(controller: number, value: number): Promise<void>;
}

/**
 * Macro API interface
 */
interface MacroAPI {
  execute(macroId: string, options?: Record<string, any>): Promise<void>;
}

/**
 * Scheduler API interface
 */
interface SchedulerAPI {
  getTodayEvents(db: any): Promise<any[]>;
  getUpcomingEvents(db: any, hours?: number): Promise<any[]>;
}

/**
 * Utility API interface
 */
interface UtilsAPI {
  wait(ms: number): Promise<void>;
  now(): number;
  formatDate(date: Date | number): string;
}

/**
 * Debug API interface
 */
interface DebugAPI {
  log(...args: any[]): void;
  inspect(variable: any, label?: string): any;
  time(label: string): void;
  timeEnd(label: string): void;
  breakpoint(): void;
}

/**
 * Complete HarmonySync API interface
 */
export interface HarmonySyncAPI {
  display: DisplayAPI;
  audio: AudioAPI;
  video: VideoAPI;
  image: ImageAPI;
  text: TextAPI;
  window: WindowAPI;
  midi: MIDIAPI;
  macro: MacroAPI;
  scheduler: SchedulerAPI;
  utils: UtilsAPI;
  debug: DebugAPI;
}

// ==================== Scripting API Service ====================

/**
 * ScriptingAPIService - Creates safe API context for user scripts
 * Extends BaseElectronService for consistent service behavior
 */
export class ScriptingAPIService extends BaseElectronService {
  protected readonly serviceName = 'ScriptingAPIService';
  
  private services: ScriptingAPIServices = {};

  /**
   * Initialize the scripting API service
   */
  protected override async onInitialize(): Promise<void> {
    this.log('info', 'Scripting API service initialized');
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    this.services = {};
  }

  /**
   * Set service references for the API
   */
  public setServices(services: ScriptingAPIServices): void {
    this.services = services;
    this.log('info', 'Service references updated');
  }

  /**
   * Create the HarmonySync API object for scripts
   */
  public createHarmonySyncAPI(): HarmonySyncAPI {
    this.ensureInitialized();
    
    const {
      displayService,
      audioService,
      videoService,
      windowService,
      macroService,
      imageService,
      textService,
      schedulerService,
      midiManager,
      mainWindow,
      audienceWindow,
      confidenceWindow,
      lowerThirdsWindow
    } = this.services;
    
    return {
      /**
       * Display API - Control content display across windows
       */
      display: {
        /**
         * Show a slide on displays
         */
        async showSlide(content: SlideContent): Promise<void> {
          if (!content || typeof content !== 'object') {
            throw new Error('Content must be an object');
          }
          
          if (displayService && audienceWindow && confidenceWindow && lowerThirdsWindow) {
            await displayService.displaySlide(
              audienceWindow(),
              confidenceWindow(),
              lowerThirdsWindow(),
              content
            );
          }
        },
        
        /**
         * Show a video slide
         */
        async showVideo(videoPath: string, options: Record<string, any> = {}): Promise<void> {
          if (!videoPath || typeof videoPath !== 'string') {
            throw new Error('Video path must be a string');
          }
          
          if (displayService && audienceWindow && confidenceWindow && lowerThirdsWindow) {
            await displayService.displayVideoSlide(
              audienceWindow(),
              confidenceWindow(),
              lowerThirdsWindow(),
              videoPath,
              options
            );
          }
        },
        
        /**
         * Show black screen on all displays
         */
        async blackScreen(): Promise<void> {
          if (displayService && audienceWindow && confidenceWindow && lowerThirdsWindow) {
            await displayService.displayBlackScreen(
              audienceWindow(),
              confidenceWindow(),
              lowerThirdsWindow()
            );
          }
        },
        
        /**
         * Clear all displays
         */
        async clearAll(): Promise<void> {
          if (displayService && audienceWindow && confidenceWindow && lowerThirdsWindow) {
            await displayService.clearAllDisplays(
              audienceWindow(),
              confidenceWindow(),
              lowerThirdsWindow()
            );
          }
        },
        
        /**
         * Update lower thirds text
         */
        async updateLowerThirds(text: string): Promise<void> {
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
        async sendToDisplay(windowName: string, message: any): Promise<void> {
          const windowMap: Record<string, BrowserWindow | null> = {
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
        async convertToOgg(inputPath: string, outputPath: string): Promise<any> {
          if (audioService) {
            return await audioService.convertToOgg(inputPath, outputPath);
          }
          throw new Error('Audio service not available');
        },
        
        /**
         * Transpose audio
         */
        async transpose(inputPath: string, outputPath: string, semitones: number): Promise<any> {
          if (audioService) {
            return await audioService.transposeAudio(inputPath, outputPath, semitones);
          }
          throw new Error('Audio service not available');
        },
        
        /**
         * Get audio metadata
         */
        async getMetadata(audioPath: string): Promise<any> {
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
        async getMetadata(videoPath: string): Promise<any> {
          if (videoService) {
            return await videoService.getVideoMetadata(videoPath);
          }
          throw new Error('Video service not available');
        },
        
        /**
         * Generate video thumbnail
         */
        async generateThumbnail(videoPath: string, outputPath: string, options: Record<string, any> = {}): Promise<any> {
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
        async getMetadata(imagePath: string): Promise<any> {
          if (imageService) {
            return await imageService.getImageMetadata(imagePath);
          }
          throw new Error('Image service not available');
        },
        
        /**
         * Generate image thumbnail
         */
        async generateThumbnail(imagePath: string, outputPath: string, options: Record<string, any> = {}): Promise<any> {
          if (imageService) {
            return await imageService.generateThumbnail(imagePath, outputPath, options);
          }
          throw new Error('Image service not available');
        },
        
        /**
         * Resize image
         */
        async resize(imagePath: string, outputPath: string, options: { width?: number; height?: number }): Promise<any> {
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
        generateGradient(options: Record<string, any>): string {
          if (textService) {
            return textService.generateAnimatedGradientCSS(options);
          }
          throw new Error('Text service not available');
        },
        
        /**
         * Format lyrics
         */
        formatLyrics(lyrics: string): string {
          if (textService) {
            return textService.formatLyrics(lyrics);
          }
          throw new Error('Text service not available');
        },
        
        /**
         * Split lyrics into slides
         */
        splitLyrics(lyrics: string, options: Record<string, any> = {}): string[] {
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
        async show(windowName: string): Promise<void> {
          const windowMap: Record<string, () => Promise<void>> = {
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
        async hide(windowName: string): Promise<void> {
          const windowMap: Record<string, () => Promise<void>> = {
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
        async toggle(windowName: string): Promise<void> {
          const windowMap: Record<string, () => Promise<void>> = {
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
        isVisible(windowName: string): boolean {
          const windowMap: Record<string, () => boolean> = {
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
        async sendNote(note: number, velocity: number = 127, duration: number = 100): Promise<void> {
          if (typeof note !== 'number' || note < 0 || note > 127) {
            throw new Error('Note must be a number between 0 and 127');
          }
          
          if (typeof velocity !== 'number' || velocity < 0 || velocity > 127) {
            throw new Error('Velocity must be a number between 0 and 127');
          }
          
          // Send MIDI note through MIDI manager
          if (midiManager && midiManager.sendNote) {
            await midiManager.sendNote(note, velocity, duration);
          } else {
            console.warn('MIDI manager not available');
          }
        },
        
        /**
         * Send MIDI control change
         */
        async sendCC(controller: number, value: number): Promise<void> {
          if (typeof controller !== 'number' || controller < 0 || controller > 127) {
            throw new Error('Controller must be a number between 0 and 127');
          }
          
          if (typeof value !== 'number' || value < 0 || value > 127) {
            throw new Error('Value must be a number between 0 and 127');
          }
          
          if (midiManager && midiManager.sendCC) {
            await midiManager.sendCC(controller, value);
          } else {
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
        async execute(macroId: string, options: Record<string, any> = {}): Promise<void> {
          if (macroService) {
            const { app } = require('electron');
            await macroService.executeMacro(app, macroId, macroId, options);
          } else {
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
        async getTodayEvents(db: any): Promise<any[]> {
          if (schedulerService) {
            return await schedulerService.getTodayEvents(db);
          }
          throw new Error('Scheduler service not available');
        },
        
        /**
         * Get upcoming events
         */
        async getUpcomingEvents(db: any, hours: number = 24): Promise<any[]> {
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
        async wait(ms: number): Promise<void> {
          return new Promise(resolve => setTimeout(resolve, ms));
        },
        
        /**
         * Get current timestamp
         */
        now(): number {
          return Date.now();
        },
        
        /**
         * Format date
         */
        formatDate(date: Date | number): string {
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
        log(...args: any[]): void {
          console.log('[DEBUG]', ...args);
        },
        
        /**
         * Inspect a variable
         */
        inspect(variable: any, label: string = 'Variable'): any {
          console.log(`[DEBUG] ${label}:`, JSON.stringify(variable, null, 2));
          return variable;
        },
        
        /**
         * Start timing an operation
         */
        time(label: string): void {
          console.time(`[DEBUG] ${label}`);
        },
        
        /**
         * End timing an operation
         */
        timeEnd(label: string): void {
          console.timeEnd(`[DEBUG] ${label}`);
        },
        
        /**
         * Breakpoint marker (logs current location)
         */
        breakpoint(): void {
          const stack = new Error().stack;
          console.log('[DEBUG] Breakpoint reached:', stack);
        }
      }
    };
  }
}

// ==================== Standalone Function (Legacy Support) ====================

/**
 * Create HarmonySync API (standalone function for backwards compatibility)
 * @deprecated Use ScriptingAPIService class instead
 */
export function createHarmonySyncAPI(services: ScriptingAPIServices): HarmonySyncAPI {
  const apiService = new ScriptingAPIService();
  apiService.setServices(services);
  return apiService.createHarmonySyncAPI();
}

// ==================== Default Export ====================

/**
 * Create and export a singleton instance
 */
let scriptingAPIServiceInstance: ScriptingAPIService | null = null;

export function getScriptingAPIService(): ScriptingAPIService {
  if (!scriptingAPIServiceInstance) {
    scriptingAPIServiceInstance = new ScriptingAPIService();
  }
  return scriptingAPIServiceInstance;
}

export default ScriptingAPIService;
