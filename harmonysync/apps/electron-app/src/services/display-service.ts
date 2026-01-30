// Moved to apps/electron-app/services/display-service.ts
// Compatibility forwarder:
export * from '../../apps/electron-app/services/display-service';
export { default } from '../../apps/electron-app/services/display-service';
      }

      if (confWin && !confWin.isDestroyed() && duration !== undefined) {
        confWin.webContents.send('start-video-countdown', duration);
        this.log('debug', `Started video countdown on confidence monitor: ${duration}s`);
      }

      this.emit('video-displayed', { path, duration });
    } catch (error) {
      this.handleError('displayVideoSlide', error);
    }
  }

  /**
   * Display slide content on all windows
   * @param content - Slide content object
   */
  public async displaySlide(content: SlideContent): Promise<void> {
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
        const lowerThirdsData = (content as any).lowerThirds;
        lowerWin.webContents.send('update-lower-thirds', lowerThirdsData);
        this.log('debug', 'Sent lower thirds data');
      }

      this.emit('slide-displayed', content);
    } catch (error) {
      this.handleError('displaySlide', error);
    }
  }

  /**
   * Display black screen on audience window
   */
  public async blackScreen(): Promise<void> {
    try {
      const audWin = this.getAudienceWindow();

      if (audWin && !audWin.isDestroyed()) {
        audWin.webContents.send('display-black-screen');
        this.log('debug', 'Displayed black screen on audience window');
      }

      this.emit('black-screen-displayed');
    } catch (error) {
      this.handleError('blackScreen', error);
    }
  }

  /**
   * Clear all displays
   */
  public async clearAll(): Promise<void> {
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
    } catch (error) {
      this.handleError('clearAll', error);
    }
  }

  /**
   * Update lower thirds text
   * @param data - Lower thirds data object
   */
  public async updateLowerThirds(data: LowerThirdsData): Promise<void> {
    try {
      const lowerWin = this.getLowerThirdsWindow();

      if (lowerWin && !lowerWin.isDestroyed()) {
        lowerWin.webContents.send('update-lower-thirds', data);
        this.log('debug', 'Updated lower thirds');
      }

      // Forwarder: implementation moved to apps/electron-app/services/display-service.ts
      export * from '../../apps/electron-app/services/display-service';
      export { default } from '../../apps/electron-app/services/display-service';
    }
