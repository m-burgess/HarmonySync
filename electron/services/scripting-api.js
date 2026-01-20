/**
 * HarmonySync Scripting API
 * Safe API wrapper for user scripts
 */

/**
 * Create the HarmonySync API object for scripts
 * @param {Object} services - Service references
 * @returns {Object} HarmonySync API
 */
function createHarmonySyncAPI(services) {
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
  } = services;
  
  return {
    /**
     * Display API - Control content display across windows
     */
    display: {
      /**
       * Show a slide on displays
       * @param {Object} content - Slide content
       */
      async showSlide(content) {
        if (!content || typeof content !== 'object') {
          throw new Error('Content must be an object');
        }
        
        await displayService.displaySlide(
          audienceWindow(),
          confidenceWindow(),
          lowerThirdsWindow(),
          content
        );
      },
      
      /**
       * Show a video slide
       * @param {string} videoPath - Path to video file
       * @param {Object} options - Display options
       */
      async showVideo(videoPath, options = {}) {
        if (!videoPath || typeof videoPath !== 'string') {
          throw new Error('Video path must be a string');
        }
        
        await displayService.displayVideoSlide(
          audienceWindow(),
          confidenceWindow(),
          lowerThirdsWindow(),
          videoPath,
          options
        );
      },
      
      /**
       * Show black screen on all displays
       */
      async blackScreen() {
        await displayService.displayBlackScreen(
          audienceWindow(),
          confidenceWindow(),
          lowerThirdsWindow()
        );
      },
      
      /**
       * Clear all displays
       */
      async clearAll() {
        await displayService.clearAllDisplays(
          audienceWindow(),
          confidenceWindow(),
          lowerThirdsWindow()
        );
      },
      
      /**
       * Update lower thirds text
       * @param {string} text - Lower thirds text
       */
      async updateLowerThirds(text) {
        if (typeof text !== 'string') {
          throw new Error('Text must be a string');
        }
        
        await displayService.updateLowerThirds(lowerThirdsWindow(), text);
      },
      
      /**
       * Send custom message to a specific display
       * @param {string} windowName - Window name ('audience', 'confidence', 'lowerThirds')
       * @param {Object} message - Message object
       */
      async sendToDisplay(windowName, message) {
        const windowMap = {
          audience: audienceWindow(),
          confidence: confidenceWindow(),
          lowerThirds: lowerThirdsWindow()
        };
        
        const window = windowMap[windowName];
        if (!window) {
          throw new Error(`Unknown window: ${windowName}`);
        }
        
        await displayService.sendToDisplay(window, message);
      }
    },
    
    /**
     * Audio API - Control audio playback and processing
     */
    audio: {
      /**
       * Convert audio to OGG format
       * @param {string} inputPath - Input audio file path
       * @param {string} outputPath - Output file path
       */
      async convertToOgg(inputPath, outputPath) {
        return await audioService.convertToOgg(inputPath, outputPath);
      },
      
      /**
       * Transpose audio
       * @param {string} inputPath - Input audio file path
       * @param {string} outputPath - Output file path
       * @param {number} semitones - Semitones to transpose
       */
      async transpose(inputPath, outputPath, semitones) {
        return await audioService.transposeAudio(inputPath, outputPath, semitones);
      },
      
      /**
       * Get audio metadata
       * @param {string} audioPath - Audio file path
       */
      async getMetadata(audioPath) {
        return await audioService.getAudioMetadata(audioPath);
      }
    },
    
    /**
     * Video API - Control video operations
     */
    video: {
      /**
       * Get video metadata
       * @param {string} videoPath - Video file path
       */
      async getMetadata(videoPath) {
        return await videoService.getVideoMetadata(videoPath);
      },
      
      /**
       * Generate video thumbnail
       * @param {string} videoPath - Video file path
       * @param {string} outputPath - Output thumbnail path
       * @param {Object} options - Thumbnail options
       */
      async generateThumbnail(videoPath, outputPath, options = {}) {
        return await videoService.generateThumbnail(videoPath, outputPath, options);
      }
    },
    
    /**
     * Image API - Control image operations
     */
    image: {
      /**
       * Get image metadata
       * @param {string} imagePath - Image file path
       */
      async getMetadata(imagePath) {
        return await imageService.getImageMetadata(imagePath);
      },
      
      /**
       * Generate image thumbnail
       * @param {string} imagePath - Image file path
       * @param {string} outputPath - Output thumbnail path
       * @param {Object} options - Thumbnail options
       */
      async generateThumbnail(imagePath, outputPath, options = {}) {
        return await imageService.generateThumbnail(imagePath, outputPath, options);
      },
      
      /**
       * Resize image
       * @param {string} imagePath - Image file path
       * @param {string} outputPath - Output file path
       * @param {Object} options - Resize options {width, height}
       */
      async resize(imagePath, outputPath, options) {
        return await imageService.resizeImage(imagePath, outputPath, options);
      }
    },
    
    /**
     * Text API - Control text operations
     */
    text: {
      /**
       * Generate CSS gradient background
       * @param {Object} options - Gradient options
       */
      generateGradient(options) {
        return textService.generateAnimatedGradientCSS(options);
      },
      
      /**
       * Format lyrics
       * @param {string} lyrics - Raw lyrics text
       */
      formatLyrics(lyrics) {
        return textService.formatLyrics(lyrics);
      },
      
      /**
       * Split lyrics into slides
       * @param {string} lyrics - Formatted lyrics
       * @param {Object} options - Split options
       */
      splitLyrics(lyrics, options = {}) {
        return textService.splitLyricsIntoSlides(lyrics, options);
      }
    },
    
    /**
     * Window API - Control window visibility and behavior
     */
    window: {
      /**
       * Show a window
       * @param {string} windowName - Window name ('audience', 'confidence', 'lowerThirds', 'main')
       */
      async show(windowName) {
        const windowMap = {
          audience: () => windowService.showAudience(audienceWindow()),
          confidence: () => windowService.showConfidence(confidenceWindow()),
          lowerThirds: () => windowService.showLowerThirds(lowerThirdsWindow()),
          main: () => windowService.focusWindow(mainWindow())
        };
        
        const action = windowMap[windowName];
        if (!action) {
          throw new Error(`Unknown window: ${windowName}`);
        }
        
        return await action();
      },
      
      /**
       * Hide a window
       * @param {string} windowName - Window name
       */
      async hide(windowName) {
        const windowMap = {
          audience: () => windowService.hideAudience(audienceWindow()),
          confidence: () => windowService.hideConfidence(confidenceWindow()),
          lowerThirds: () => windowService.hideLowerThirds(lowerThirdsWindow())
        };
        
        const action = windowMap[windowName];
        if (!action) {
          throw new Error(`Unknown window: ${windowName}`);
        }
        
        return await action();
      },
      
      /**
       * Toggle window visibility
       * @param {string} windowName - Window name
       */
      async toggle(windowName) {
        const windowMap = {
          audience: () => windowService.toggleAudience(audienceWindow()),
          confidence: () => windowService.toggleConfidence(confidenceWindow()),
          lowerThirds: () => windowService.toggleLowerThirds(lowerThirdsWindow())
        };
        
        const action = windowMap[windowName];
        if (!action) {
          throw new Error(`Unknown window: ${windowName}`);
        }
        
        return await action();
      },
      
      /**
       * Check if window is visible
       * @param {string} windowName - Window name
       */
      isVisible(windowName) {
        const windowMap = {
          audience: () => windowService.isAudienceVisible(audienceWindow()),
          confidence: () => windowService.isConfidenceVisible(confidenceWindow()),
          lowerThirds: () => windowService.isLowerThirdsVisible(lowerThirdsWindow())
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
       * @param {number} note - MIDI note number (0-127)
       * @param {number} velocity - Note velocity (0-127)
       * @param {number} duration - Note duration in milliseconds
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
          return await midiManager.sendNote(note, velocity, duration);
        } else {
          console.warn('MIDI manager not available');
        }
      },
      
      /**
       * Send MIDI control change
       * @param {number} controller - Controller number (0-127)
       * @param {number} value - Controller value (0-127)
       */
      async sendCC(controller, value) {
        if (typeof controller !== 'number' || controller < 0 || controller > 127) {
          throw new Error('Controller must be a number between 0 and 127');
        }
        
        if (typeof value !== 'number' || value < 0 || value > 127) {
          throw new Error('Value must be a number between 0 and 127');
        }
        
        if (midiManager && midiManager.sendCC) {
          return await midiManager.sendCC(controller, value);
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
       * @param {string} macroId - Macro ID
       * @param {Object} options - Execution options
       */
      async execute(macroId, options = {}) {
        const appHandle = require('electron').app;
        return await macroService.executeMacro(appHandle, macroId, macroId, options);
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
        return await schedulerService.getTodayEvents(db);
      },
      
      /**
       * Get upcoming events
       * @param {number} hours - Hours to look ahead
       */
      async getUpcomingEvents(db, hours = 24) {
        return await schedulerService.getUpcomingEvents(db, hours);
      }
    },
    
    /**
     * Utility functions
     */
    utils: {
      /**
       * Wait for a specified duration
       * @param {number} ms - Milliseconds to wait
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
       * @param {Date|number} date - Date to format
       * @param {string} format - Format string
       */
      formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
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
       * @param {...any} args - Arguments to log
       */
      log(...args) {
        console.log('[DEBUG]', ...args);
      },
      
      /**
       * Inspect a variable
       * @param {any} variable - Variable to inspect
       * @param {string} label - Optional label
       */
      inspect(variable, label = 'Variable') {
        console.log(`[DEBUG] ${label}:`, JSON.stringify(variable, null, 2));
        return variable;
      },
      
      /**
       * Start timing an operation
       * @param {string} label - Timer label
       */
      time(label) {
        console.time(`[DEBUG] ${label}`);
      },
      
      /**
       * End timing an operation
       * @param {string} label - Timer label
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

module.exports = {
  createHarmonySyncAPI
};
