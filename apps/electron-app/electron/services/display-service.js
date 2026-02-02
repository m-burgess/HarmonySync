"use strict";
/**
 * Display Service
 * Handles coordination of content display across multiple windows
 * (audience, confidence, lower thirds)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisplayService = void 0;
const services_1 = require("../types/services");
/**
 * Display Service Implementation
 * Coordinates content display across multiple display windows
 */
class DisplayService extends services_1.BaseElectronService {
    constructor(getAudienceWindow, getConfidenceWindow, getLowerThirdsWindow, config) {
        super(config);
        this.serviceName = 'DisplayService';
        this.getAudienceWindow = getAudienceWindow;
        this.getConfidenceWindow = getConfidenceWindow;
        this.getLowerThirdsWindow = getLowerThirdsWindow;
    }
    /**
     * Initialize the display service
     */
    async onInitialize() {
        this.log('info', 'Display service ready');
    }
    /**
     * Clean up resources
     */
    onDispose() {
        this.log('info', 'Display service disposed');
    }
    /**
     * Display video slide on audience and confidence windows
     * @param path - Path to video file
     * @param duration - Video duration in seconds (optional)
     */
    async displayVideoSlide(path, duration) {
        try {
            const audWin = this.getAudienceWindow();
            const confWin = this.getConfidenceWindow();
            if (audWin && !audWin.isDestroyed()) {
                audWin.webContents.send('display-video-slide', path);
                this.log('debug', `Sent video slide to audience window: ${path}`);
            }
            if (confWin && !confWin.isDestroyed() && duration !== undefined) {
                confWin.webContents.send('start-video-countdown', duration);
                this.log('debug', `Started video countdown on confidence monitor: ${duration}s`);
            }
            this.emit('video-displayed', { path, duration });
        }
        catch (error) {
            this.handleError('displayVideoSlide', error);
        }
    }
    /**
     * Display slide content on all windows
     * @param content - Slide content object
     */
    async displaySlide(content) {
        try {
            const audWin = this.getAudienceWindow();
            const confWin = this.getConfidenceWindow();
            const lowerWin = this.getLowerThirdsWindow();
            if (audWin && !audWin.isDestroyed()) {
                audWin.webContents.send('display-slide', content);
                this.log('debug', `Sent slide to audience window: ${content.type}`);
            }
            if (confWin && !confWin.isDestroyed()) {
                confWin.webContents.send('display-slide', content);
                this.log('debug', `Sent slide to confidence window: ${content.type}`);
            }
            // Handle lower thirds if included in content
            if (lowerWin && !lowerWin.isDestroyed() && 'lowerThirds' in content) {
                const lowerThirdsData = content.lowerThirds;
                lowerWin.webContents.send('update-lower-thirds', lowerThirdsData);
                this.log('debug', 'Sent lower thirds data');
            }
            this.emit('slide-displayed', content);
        }
        catch (error) {
            this.handleError('displaySlide', error);
        }
    }
    /**
     * Display black screen on audience window
     */
    async blackScreen() {
        try {
            const audWin = this.getAudienceWindow();
            if (audWin && !audWin.isDestroyed()) {
                audWin.webContents.send('display-black-screen');
                this.log('debug', 'Displayed black screen on audience window');
            }
            this.emit('black-screen-displayed');
        }
        catch (error) {
            this.handleError('blackScreen', error);
        }
    }
    /**
     * Clear all displays
     */
    async clearAll() {
        try {
            const audWin = this.getAudienceWindow();
            const confWin = this.getConfidenceWindow();
            const lowerWin = this.getLowerThirdsWindow();
            if (audWin && !audWin.isDestroyed()) {
                audWin.webContents.send('clear-display');
                this.log('debug', 'Cleared audience window');
            }
            if (confWin && !confWin.isDestroyed()) {
                confWin.webContents.send('clear-display');
                this.log('debug', 'Cleared confidence window');
            }
            if (lowerWin && !lowerWin.isDestroyed()) {
                lowerWin.webContents.send('clear-display');
                this.log('debug', 'Cleared lower thirds window');
            }
            this.emit('displays-cleared');
        }
        catch (error) {
            this.handleError('clearAll', error);
        }
    }
    /**
     * Update lower thirds text
     * @param data - Lower thirds data object
     */
    async updateLowerThirds(data) {
        try {
            const lowerWin = this.getLowerThirdsWindow();
            if (lowerWin && !lowerWin.isDestroyed()) {
                lowerWin.webContents.send('update-lower-thirds', data);
                this.log('debug', 'Updated lower thirds');
            }
            this.emit('lower-thirds-updated', data);
        }
        catch (error) {
            this.handleError('updateLowerThirds', error);
        }
    }
    /**
     * Send custom message to specific display
     * @param windowType - Type of window ('audience', 'confidence', 'lower-thirds')
     * @param channel - IPC channel name
     * @param data - Data to send
     */
    async sendToDisplay(windowType, channel, data) {
        try {
            let win = null;
            switch (windowType) {
                case 'audience':
                    win = this.getAudienceWindow();
                    break;
                case 'confidence':
                    win = this.getConfidenceWindow();
                    break;
                case 'lower-thirds':
                    win = this.getLowerThirdsWindow();
                    break;
            }
            if (win && !win.isDestroyed()) {
                win.webContents.send(channel, data);
                this.log('debug', `Sent message to ${windowType} window on channel ${channel}`);
            }
            else {
                this.log('warn', `${windowType} window not available`);
            }
        }
        catch (error) {
            this.handleError(`sendToDisplay(${windowType}, ${channel})`, error);
        }
    }
    /**
     * Broadcast message to all displays
     * @param channel - IPC channel name
     * @param data - Data to send
     */
    async broadcast(channel, data) {
        try {
            const audWin = this.getAudienceWindow();
            const confWin = this.getConfidenceWindow();
            const lowerWin = this.getLowerThirdsWindow();
            let sentCount = 0;
            if (audWin && !audWin.isDestroyed()) {
                audWin.webContents.send(channel, data);
                sentCount++;
            }
            if (confWin && !confWin.isDestroyed()) {
                confWin.webContents.send(channel, data);
                sentCount++;
            }
            if (lowerWin && !lowerWin.isDestroyed()) {
                lowerWin.webContents.send(channel, data);
                sentCount++;
            }
            this.log('debug', `Broadcast message on channel ${channel} to ${sentCount} windows`);
            this.emit('broadcast-sent', { channel, data, count: sentCount });
        }
        catch (error) {
            this.handleError(`broadcast(${channel})`, error);
        }
    }
    /**
     * Check if a specific window is available
     * @param windowType - Type of window to check
     * @returns True if window exists and is not destroyed
     */
    isWindowAvailable(windowType) {
        let win = null;
        switch (windowType) {
            case 'audience':
                win = this.getAudienceWindow();
                break;
            case 'confidence':
                win = this.getConfidenceWindow();
                break;
            case 'lower-thirds':
                win = this.getLowerThirdsWindow();
                break;
        }
        return win !== null && !win.isDestroyed();
    }
    /**
     * Get count of available display windows
     */
    getAvailableWindowsCount() {
        let count = 0;
        if (this.isWindowAvailable('audience'))
            count++;
        if (this.isWindowAvailable('confidence'))
            count++;
        if (this.isWindowAvailable('lower-thirds'))
            count++;
        return count;
    }
    /**
     * Update window getter functions (useful if windows are recreated)
     */
    updateWindowGetters(getAudienceWindow, getConfidenceWindow, getLowerThirdsWindow) {
        if (getAudienceWindow) {
            this.getAudienceWindow = getAudienceWindow;
            this.log('debug', 'Updated audience window getter');
        }
        if (getConfidenceWindow) {
            this.getConfidenceWindow = getConfidenceWindow;
            this.log('debug', 'Updated confidence window getter');
        }
        if (getLowerThirdsWindow) {
            this.getLowerThirdsWindow = getLowerThirdsWindow;
            this.log('debug', 'Updated lower thirds window getter');
        }
    }
}
exports.DisplayService = DisplayService;
// Export for backward compatibility
exports.default = DisplayService;
