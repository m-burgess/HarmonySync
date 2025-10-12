// Lyric Transition Manager for smooth 0.2s fade transitions
// Handles fade-in/fade-out effects for lyrics display

import * as TauriCore from '@tauri-apps/api/core';

class LyricTransitionManager {
  constructor() {
    this.transitionDuration = 200; // 0.2 seconds in milliseconds
    this.isTransitioning = false;
    this.currentContent = null;
    this.pendingContent = null;
  }

  // Set custom transition duration (default 200ms = 0.2s)
  setTransitionDuration(duration) {
    this.transitionDuration = duration;
  }

  // Smooth transition between lyric content
  async transitionTo(newContent, targetElement) {
    if (this.isTransitioning) {
      // Queue the new content if already transitioning
      this.pendingContent = newContent;
      return;
    }

    this.isTransitioning = true;

    try {
      // If there's existing content, fade it out first
      if (this.currentContent && targetElement) {
        await this.fadeOut(targetElement);
      }

      // Update content
      this.currentContent = newContent;

      // Fade in new content
      if (newContent && targetElement) {
        await this.fadeIn(targetElement, newContent);
      }

      // Check if there's pending content to display
      if (this.pendingContent) {
        const pending = this.pendingContent;
        this.pendingContent = null;
        this.isTransitioning = false;
        await this.transitionTo(pending, targetElement);
        return;
      }

    } catch (error) {
      console.error('Error during lyric transition:', error);
    } finally {
      this.isTransitioning = false;
    }
  }

  // Fade out current content
  async fadeOut(element) {
    return new Promise((resolve) => {
      if (!element) {
        resolve();
        return;
      }

      // Ensure element is visible before fading out
      if (element.style.opacity === '0' || element.style.display === 'none') {
        resolve();
        return;
      }

      // Set initial opacity if not set
      if (!element.style.opacity) {
        element.style.opacity = '1';
      }

      // Start fade out animation
      element.style.transition = `opacity ${this.transitionDuration}ms ease-in-out`;
      element.style.opacity = '0';

      // Wait for animation to complete
      setTimeout(() => {
        element.style.display = 'none';
        resolve();
      }, this.transitionDuration);
    });
  }

  // Fade in new content
  async fadeIn(element, content) {
    return new Promise((resolve) => {
      if (!element) {
        resolve();
        return;
      }

      // Set content based on type
      if (content === null) {
        // Clear content case
        element.innerHTML = '';
        element.style.display = 'none';
        resolve();
        return;
      }

      // Set up element for fade in
      element.style.opacity = '0';
      element.style.display = 'flex'; // Use flex for centering
      element.style.transition = `opacity ${this.transitionDuration}ms ease-in-out`;

      // Update content based on type
      if (content.type === 'lyrics') {
        element.innerHTML = content.text.map(line => `<div>${line}</div>`).join('');
      } else if (content.type === 'image') {
        const assetUrl = TauriCore.convertFileSrc(content.path);
        element.innerHTML = `<img src="${assetUrl}" alt="${content.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />`;
      } else {
        element.innerHTML = '';
      }

      // Start fade in animation
      setTimeout(() => {
        element.style.opacity = '1';
        setTimeout(resolve, this.transitionDuration);
      }, 10); // Small delay to ensure display change is applied
    });
  }

  // Immediate display without transition (for initial load)
  displayImmediate(content, element) {
    if (!element) return;

    this.currentContent = content;
    element.style.transition = 'none';

    if (content === null) {
      element.innerHTML = '';
      element.style.display = 'none';
      element.style.opacity = '0';
      return;
    }

    element.style.display = 'flex';
    element.style.opacity = '1';

    if (content.type === 'lyrics') {
      element.innerHTML = content.text.map(line => `<div>${line}</div>`).join('');
    } else if (content.type === 'image') {
      const assetUrl = TauriCore.convertFileSrc(content.path);
      element.innerHTML = `<img src="${assetUrl}" alt="${content.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />`;
    } else {
      element.innerHTML = '';
    }

    // Restore transition for future changes
    setTimeout(() => {
      element.style.transition = `opacity ${this.transitionDuration}ms ease-in-out`;
    }, 50);
  }

  // Clear display with fade out
  async clear(element) {
    await this.transitionTo(null, element);
  }

  // Get current status
  getStatus() {
    return {
      isTransitioning: this.isTransitioning,
      transitionDuration: this.transitionDuration,
      hasContent: this.currentContent !== null,
      hasPendingContent: this.pendingContent !== null
    };
  }
}

// Export singleton instance
export const lyricTransitionManager = new LyricTransitionManager();

// Export class for testing/multiple instances
export { LyricTransitionManager };