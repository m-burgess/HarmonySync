"use strict";
/**
 * Window Service
 * Handles window lifecycle management (show, hide, focus, creation)
 * Manages audience, confidence, and lower thirds windows across displays
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowService = void 0;
exports.getWindowService = getWindowService;
const services_1 = require("../types/services");
/**
 * Window Service Implementation
 * Provides comprehensive window management with proper error handling
 */
class WindowService extends services_1.BaseElectronService {
    constructor(config) {
        super(config);
        this.serviceName = 'WindowService';
    }
    /**
     * Initialize the window service
     */
    async onInitialize() {
        this.log('info', 'Window service ready');
    }
    /**
     * Clean up resources
     */
    onDispose() {
        this.log('info', 'Window service disposed');
    }
    /**
     * Register window getters
     * @param audienceGetter - Function to get audience window
     * @param confidenceGetter - Function to get confidence window
     * @param lowerThirdsGetter - Function to get lower thirds window
     */
    registerWindowGetters(audienceGetter, confidenceGetter, lowerThirdsGetter) {
        this.audienceWindowGetter = audienceGetter;
        this.confidenceWindowGetter = confidenceGetter;
        this.lowerThirdsWindowGetter = lowerThirdsGetter;
        this.log('info', 'Window getters registered');
    }
    /**
     * Show audience window
     * @returns Promise that resolves when window is shown
     */
    async showAudience() {
        try {
            const win = this.getWindow(this.audienceWindowGetter, 'audience');
            if (win) {
                win.show();
                this.log('info', 'Audience window shown');
            }
        }
        catch (error) {
            this.handleError('showAudience', error);
        }
    }
    /**
     * Hide audience window
     * @returns Promise that resolves when window is hidden
     */
    async hideAudience() {
        try {
            const win = this.getWindow(this.audienceWindowGetter, 'audience');
            if (win) {
                win.hide();
                this.log('info', 'Audience window hidden');
            }
        }
        catch (error) {
            this.handleError('hideAudience', error);
        }
    }
    /**
     * Show confidence window
     * @returns Promise that resolves when window is shown
     */
    async showConfidence() {
        try {
            const win = this.getWindow(this.confidenceWindowGetter, 'confidence');
            if (win) {
                win.show();
                this.log('info', 'Confidence window shown');
            }
        }
        catch (error) {
            this.handleError('showConfidence', error);
        }
    }
    /**
     * Hide confidence window
     * @returns Promise that resolves when window is hidden
     */
    async hideConfidence() {
        try {
            const win = this.getWindow(this.confidenceWindowGetter, 'confidence');
            if (win) {
                win.hide();
                this.log('info', 'Confidence window hidden');
            }
        }
        catch (error) {
            this.handleError('hideConfidence', error);
        }
    }
    /**
     * Show lower thirds window
     * @returns Promise that resolves when window is shown
     */
    async showLowerThirds() {
        try {
            const win = this.getWindow(this.lowerThirdsWindowGetter, 'lowerThirds');
            if (win) {
                win.show();
                this.log('info', 'Lower thirds window shown');
            }
        }
        catch (error) {
            this.handleError('showLowerThirds', error);
        }
    }
    /**
     * Hide lower thirds window
     * @returns Promise that resolves when window is hidden
     */
    async hideLowerThirds() {
        try {
            const win = this.getWindow(this.lowerThirdsWindowGetter, 'lowerThirds');
            if (win) {
                win.hide();
                this.log('info', 'Lower thirds window hidden');
            }
        }
        catch (error) {
            this.handleError('hideLowerThirds', error);
        }
    }
    /**
     * Toggle window visibility
     * @param windowType - Type of window to toggle
     * @returns Promise that resolves to new visibility state
     */
    async toggleWindow(windowType) {
        try {
            const getter = this.getWindowGetterByType(windowType);
            const win = this.getWindow(getter, windowType);
            if (win) {
                const isVisible = win.isVisible();
                if (isVisible) {
                    win.hide();
                    this.log('info', `${windowType} window hidden`);
                    return false;
                }
                else {
                    win.show();
                    this.log('info', `${windowType} window shown`);
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            this.handleError('toggleWindow', error);
        }
    }
    /**
     * Focus window
     * @param windowType - Type of window to focus
     * @returns Promise that resolves when window is focused
     */
    async focusWindow(windowType) {
        try {
            const getter = this.getWindowGetterByType(windowType);
            const win = this.getWindow(getter, windowType);
            if (win) {
                win.focus();
                this.log('info', `${windowType} window focused`);
            }
        }
        catch (error) {
            this.handleError('focusWindow', error);
        }
    }
    /**
     * Minimize window
     * @param windowType - Type of window to minimize
     * @returns Promise that resolves when window is minimized
     */
    async minimizeWindow(windowType) {
        try {
            const getter = this.getWindowGetterByType(windowType);
            const win = this.getWindow(getter, windowType);
            if (win) {
                win.minimize();
                this.log('info', `${windowType} window minimized`);
            }
        }
        catch (error) {
            this.handleError('minimizeWindow', error);
        }
    }
    /**
     * Maximize or restore window
     * @param windowType - Type of window to maximize
     * @returns Promise that resolves when window is maximized/restored
     */
    async maximizeWindow(windowType) {
        try {
            const getter = this.getWindowGetterByType(windowType);
            const win = this.getWindow(getter, windowType);
            if (win) {
                if (win.isMaximized()) {
                    win.unmaximize();
                    this.log('info', `${windowType} window restored`);
                }
                else {
                    win.maximize();
                    this.log('info', `${windowType} window maximized`);
                }
            }
        }
        catch (error) {
            this.handleError('maximizeWindow', error);
        }
    }
    /**
     * Set window always on top
     * @param windowType - Type of window
     * @param alwaysOnTop - Whether window should stay on top
     * @returns Promise that resolves when property is set
     */
    async setAlwaysOnTop(windowType, alwaysOnTop) {
        try {
            const getter = this.getWindowGetterByType(windowType);
            const win = this.getWindow(getter, windowType);
            if (win) {
                win.setAlwaysOnTop(alwaysOnTop);
                this.log('info', `${windowType} window always on top: ${alwaysOnTop}`);
            }
        }
        catch (error) {
            this.handleError('setAlwaysOnTop', error);
        }
    }
    /**
     * Check if window is visible
     * @param windowType - Type of window to check
     * @returns Promise that resolves to visibility status
     */
    async isWindowVisible(windowType) {
        try {
            const getter = this.getWindowGetterByType(windowType);
            const win = this.getWindow(getter, windowType);
            return win ? win.isVisible() : false;
        }
        catch (error) {
            this.log('warn', `Error checking ${windowType} window visibility:`, error);
            return false;
        }
    }
    /**
     * Get window state
     * @param windowType - Type of window
     * @returns Promise that resolves to window state
     */
    async getWindowState(windowType) {
        try {
            const getter = this.getWindowGetterByType(windowType);
            const win = this.getWindow(getter, windowType);
            if (!win) {
                return null;
            }
            const bounds = win.getBounds();
            return {
                isVisible: win.isVisible(),
                isFullScreen: win.isFullScreen(),
                isMinimized: win.isMinimized(),
                isMaximized: win.isMaximized(),
                bounds: {
                    x: bounds.x,
                    y: bounds.y,
                    width: bounds.width,
                    height: bounds.height
                }
            };
        }
        catch (error) {
            this.handleError('getWindowState', error);
        }
    }
    /**
     * Get all windows status
     * @returns Promise that resolves to status of all windows
     */
    async getAllWindowsStatus() {
        try {
            const audienceWin = this.audienceWindowGetter?.();
            const confidenceWin = this.confidenceWindowGetter?.();
            const lowerThirdsWin = this.lowerThirdsWindowGetter?.();
            return {
                audience: {
                    visible: audienceWin ? audienceWin.isVisible() : false,
                    exists: audienceWin !== null && audienceWin !== undefined
                },
                confidence: {
                    visible: confidenceWin ? confidenceWin.isVisible() : false,
                    exists: confidenceWin !== null && confidenceWin !== undefined
                },
                lowerThirds: {
                    visible: lowerThirdsWin ? lowerThirdsWin.isVisible() : false,
                    exists: lowerThirdsWin !== null && lowerThirdsWin !== undefined
                }
            };
        }
        catch (error) {
            this.handleError('getAllWindowsStatus', error);
        }
    }
    /**
     * Hide all windows
     * @returns Promise that resolves when all windows are hidden
     */
    async hideAllWindows() {
        try {
            await Promise.all([
                this.hideAudience(),
                this.hideConfidence(),
                this.hideLowerThirds()
            ]);
            this.log('info', 'All windows hidden');
        }
        catch (error) {
            this.handleError('hideAllWindows', error);
        }
    }
    /**
     * Show all windows
     * @returns Promise that resolves when all windows are shown
     */
    async showAllWindows() {
        try {
            await Promise.all([
                this.showAudience(),
                this.showConfidence(),
                this.showLowerThirds()
            ]);
            this.log('info', 'All windows shown');
        }
        catch (error) {
            this.handleError('showAllWindows', error);
        }
    }
    /**
     * Get window by type
     * @param getter - Window getter function
     * @param windowType - Type of window (for logging)
     * @returns Browser window or null
     */
    getWindow(getter, windowType) {
        if (!getter) {
            this.log('warn', `${windowType} window getter not registered`);
            return null;
        }
        const win = getter();
        if (!win) {
            this.log('warn', `${windowType} window not found`);
        }
        return win;
    }
    /**
     * Get window getter by type
     * @param windowType - Type of window
     * @returns Window getter function
     */
    getWindowGetterByType(windowType) {
        switch (windowType) {
            case 'audience':
                return this.audienceWindowGetter;
            case 'confidence':
                return this.confidenceWindowGetter;
            case 'lowerThirds':
                return this.lowerThirdsWindowGetter;
            default:
                throw new Error(`Unknown window type: ${windowType}`);
        }
    }
}
exports.WindowService = WindowService;
// Export singleton instance
let windowServiceInstance = null;
/**
 * Get or create the window service singleton
 */
function getWindowService(config) {
    if (!windowServiceInstance) {
        windowServiceInstance = new WindowService(config);
    }
    return windowServiceInstance;
}
// Export for backward compatibility
exports.default = WindowService;
