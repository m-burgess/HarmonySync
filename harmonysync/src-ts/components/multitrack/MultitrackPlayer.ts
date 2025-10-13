/**
 * MultitrackPlayer Component - Bottom area displaying multitrack audio controls
 * Inspired by VS Code's integrated terminal
 */

import { Component } from '../Component';
import { Track } from '../../types';

export interface MultitrackPlayerOptions {
  parent?: HTMLElement;
  onTrackUpdate?: (tracks: Track[]) => void;
}

export class MultitrackPlayer extends Component<HTMLDivElement> {
  private tracks: Track[] = [];
  private isPlaying: boolean = false;
  private currentTime: number = 0;
  private duration: number = 0;
  private options: MultitrackPlayerOptions;
  private audioContext: AudioContext | null = null;

  constructor(options: MultitrackPlayerOptions = {}) {
    super('div', {
      className: 'multitrack-player',
      parent: options.parent,
    });
    this.options = options;
    this.render();
  }

  setTracks(tracks: Track[]): void {
    this.tracks = tracks;
    this.render();
  }

  getTracks(): Track[] {
    return this.tracks;
  }

  render(): void {
    const html = `
      <div class="multitrack-header">
        <div class="transport-controls">
          <button class="transport-button" data-action="play-pause" title="${this.isPlaying ? 'Pause' : 'Play'}">
            <span class="codicon ${this.isPlaying ? 'codicon-debug-pause' : 'codicon-play'}"></span>
          </button>
          <button class="transport-button" data-action="stop" title="Stop">
            <span class="codicon codicon-debug-stop"></span>
          </button>
          <button class="transport-button" data-action="rewind" title="Rewind">
            <span class="codicon codicon-debug-step-back"></span>
          </button>
        </div>
        <div class="time-display">
          <span class="current-time">${this.formatTime(this.currentTime)}</span>
          <span class="separator">/</span>
          <span class="total-time">${this.formatTime(this.duration)}</span>
        </div>
      </div>
      <div class="track-controls">
        ${this.renderTracks()}
      </div>
    `;
    this.setHTML(html);
    this.attachEventListeners();
  }

  private renderTracks(): string {
    if (this.tracks.length === 0) {
      return '<div class="empty-state">No tracks loaded</div>';
    }

    return this.tracks
      .map(
        (track) => `
        <div class="track-control" data-track-id="${track.id}">
          <div class="track-info">
            <span class="track-name">${this.escapeHtml(track.name)}</span>
            <div class="track-buttons">
              <button class="track-button ${track.muted ? 'active' : ''}" 
                      data-action="mute" 
                      data-track-id="${track.id}"
                      title="Mute">
                M
              </button>
              <button class="track-button ${track.solo ? 'active' : ''}" 
                      data-action="solo" 
                      data-track-id="${track.id}"
                      title="Solo">
                S
              </button>
            </div>
          </div>
          <div class="track-controls-row">
            <div class="volume-control">
              <label class="control-label">Vol</label>
              <input type="range" 
                     class="volume-slider" 
                     min="0" 
                     max="100" 
                     value="${track.volume * 100}"
                     data-action="volume"
                     data-track-id="${track.id}">
              <span class="volume-value">${Math.round(track.volume * 100)}</span>
            </div>
            <div class="pan-control">
              <label class="control-label">Pan</label>
              <div class="pan-buttons">
                <button class="pan-button ${track.pan === -1 ? 'active' : ''}" 
                        data-action="pan-left" 
                        data-track-id="${track.id}">L</button>
                <button class="pan-button ${track.pan === 0 ? 'active' : ''}" 
                        data-action="pan-center" 
                        data-track-id="${track.id}">C</button>
                <button class="pan-button ${track.pan === 1 ? 'active' : ''}" 
                        data-action="pan-right" 
                        data-track-id="${track.id}">R</button>
              </div>
            </div>
          </div>
        </div>
      `
      )
      .join('');
  }

  private attachEventListeners(): void {
    // Transport controls
    const playPauseBtn = this.element.querySelector('[data-action="play-pause"]');
    playPauseBtn?.addEventListener('click', () => this.togglePlayPause());

    const stopBtn = this.element.querySelector('[data-action="stop"]');
    stopBtn?.addEventListener('click', () => this.stop());

    const rewindBtn = this.element.querySelector('[data-action="rewind"]');
    rewindBtn?.addEventListener('click', () => this.rewind());

    // Track controls
    this.attachTrackControlListeners();
  }

  private attachTrackControlListeners(): void {
    // Mute buttons
    const muteButtons = this.element.querySelectorAll('[data-action="mute"]');
    muteButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        const trackId = (e.target as HTMLElement).getAttribute('data-track-id');
        if (trackId) {
          this.toggleMute(trackId);
        }
      });
    });

    // Solo buttons
    const soloButtons = this.element.querySelectorAll('[data-action="solo"]');
    soloButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        const trackId = (e.target as HTMLElement).getAttribute('data-track-id');
        if (trackId) {
          this.toggleSolo(trackId);
        }
      });
    });

    // Volume sliders
    const volumeSliders = this.element.querySelectorAll('[data-action="volume"]');
    volumeSliders.forEach((slider) => {
      slider.addEventListener('input', (e) => {
        const trackId = (e.target as HTMLInputElement).getAttribute('data-track-id');
        const value = parseFloat((e.target as HTMLInputElement).value) / 100;
        if (trackId) {
          this.setVolume(trackId, value);
        }
      });
    });

    // Pan buttons
    ['pan-left', 'pan-center', 'pan-right'].forEach((action) => {
      const buttons = this.element.querySelectorAll(`[data-action="${action}"]`);
      buttons.forEach((button) => {
        button.addEventListener('click', (e) => {
          const trackId = (e.target as HTMLElement).getAttribute('data-track-id');
          if (trackId) {
            const panValue = action === 'pan-left' ? -1 : action === 'pan-center' ? 0 : 1;
            this.setPan(trackId, panValue);
          }
        });
      });
    });
  }

  private togglePlayPause(): void {
    this.isPlaying = !this.isPlaying;
    this.render();
    // In a real implementation, this would control audio playback
  }

  private stop(): void {
    this.isPlaying = false;
    this.currentTime = 0;
    this.render();
  }

  private rewind(): void {
    this.currentTime = 0;
    this.render();
  }

  private toggleMute(trackId: string): void {
    const track = this.tracks.find((t) => t.id === trackId);
    if (track) {
      track.muted = !track.muted;
      this.notifyTrackUpdate();
      this.render();
    }
  }

  private toggleSolo(trackId: string): void {
    const track = this.tracks.find((t) => t.id === trackId);
    if (track) {
      track.solo = !track.solo;
      this.notifyTrackUpdate();
      this.render();
    }
  }

  private setVolume(trackId: string, volume: number): void {
    const track = this.tracks.find((t) => t.id === trackId);
    if (track) {
      track.volume = volume;
      this.notifyTrackUpdate();
      // Update the display without full re-render for smoother experience
      const valueDisplay = this.element.querySelector(`[data-track-id="${trackId}"] .volume-value`);
      if (valueDisplay) {
        valueDisplay.textContent = Math.round(volume * 100).toString();
      }
    }
  }

  private setPan(trackId: string, pan: number): void {
    const track = this.tracks.find((t) => t.id === trackId);
    if (track) {
      track.pan = pan;
      this.notifyTrackUpdate();
      this.render();
    }
  }

  private notifyTrackUpdate(): void {
    if (this.options.onTrackUpdate) {
      this.options.onTrackUpdate(this.tracks);
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
