/**
 * Audio Service - Business logic for audio operations
 * 
 * This service abstracts all audio-related functionality including:
 * - Loading and managing audio tracks
 * - Transposing audio files
 * - Playback controls
 * - Volume and pan controls
 * - Mixer configuration persistence
 * - Memory monitoring
 * - Audio service management
 * 
 * OOP Principles:
 * - Encapsulation: Private members for internal state
 * - Single Responsibility: Only handles audio operations
 * - Dependency Injection: Depends on IpcService abstraction
 * - Interface Segregation: Implements IAudioService
 */

import { BaseService } from '../base/BaseService';
import type { IAudioService, IIpcService } from '../types/services';
import type { AudioTrack, MemoryUsage, MixerConfig, TransposeResult } from '../types';
import * as audioUtils from '../utils/audio/audio-nodejs.js';

/**
 * Audio Service Implementation
 */
export class AudioService extends BaseService implements IAudioService {
  protected readonly serviceName = 'AudioService';
  
  private readonly ipc: IIpcService;
  private memoryMonitorInterval: NodeJS.Timeout | null = null;

  /**
   * Constructor
   * @param ipcService - IPC service for communication with main process
   */
  constructor(ipcService: IIpcService) {
    super();
    this.ipc = ipcService;
  }

  /**
   * Load audio tracks from a folder
   * @param folderPath - Path to folder containing audio files
   * @returns Array of track objects
   */
  public async loadTracks(folderPath: string): Promise<AudioTrack[]> {
    try {
      return await this.ipc.invoke('audio:loadTracks', folderPath) as AudioTrack[];
    } catch (error) {
      return this.handleError('loadTracks', error);
    }
  }

  /**
   * Transpose audio files by semitones
   * @param sourcePath - Source folder path
   * @param semitones - Number of semitones to transpose (+/-)
   * @returns Transpose result
   */
  public async transpose(sourcePath: string, semitones: number): Promise<TransposeResult> {
    try {
      return await this.ipc.invoke('audio:transpose', sourcePath, semitones) as TransposeResult;
    } catch (error) {
      return this.handleError('transpose', error);
    }
  }

  /**
   * Start playback
   */
  public async play(): Promise<void> {
    try {
      await this.ipc.invoke('audio:play');
    } catch (error) {
      return this.handleError('play', error);
    }
  }

  /**
   * Stop playback
   */
  public async stop(): Promise<void> {
    try {
      await this.ipc.invoke('audio:stop');
    } catch (error) {
      return this.handleError('stop', error);
    }
  }

  /**
   * Pause playback
   */
  public async pause(): Promise<void> {
    try {
      await this.ipc.invoke('audio:pause');
    } catch (error) {
      return this.handleError('pause', error);
    }
  }

  /**
   * Seek to position in seconds
   * @param position - Position in seconds
   */
  public async seek(position: number): Promise<void> {
    try {
      await this.ipc.invoke('audio:seek', position);
    } catch (error) {
      return this.handleError('seek', error);
    }
  }

  /**
   * Set track volume
   * @param trackIndex - Track index
   * @param volume - Volume (0-1)
   */
  public async setTrackVolume(trackIndex: number, volume: number): Promise<void> {
    try {
      await this.ipc.invoke('audio:setTrackVolume', trackIndex, volume);
    } catch (error) {
      return this.handleError('setTrackVolume', error);
    }
  }

  /**
   * Set track pan
   * @param trackIndex - Track index
   * @param pan - Pan value (-1 = left, 0 = center, 1 = right)
   */
  public async setTrackPan(trackIndex: number, pan: number): Promise<void> {
    try {
      await this.ipc.invoke('audio:setTrackPan', trackIndex, pan);
    } catch (error) {
      return this.handleError('setTrackPan', error);
    }
  }

  /**
   * Mute/unmute a track
   * @param trackIndex - Track index
   * @param muted - Whether to mute
   */
  public async muteTrack(trackIndex: number, muted: boolean): Promise<void> {
    try {
      await this.ipc.invoke('audio:setTrackMute', trackIndex, muted);
    } catch (error) {
      return this.handleError('muteTrack', error);
    }
  }

  /**
   * Set global/master volume
   * @param volume - Volume (0-1)
   */
  public async setGlobalVolume(volume: number): Promise<void> {
    try {
      await audioUtils.setGlobalVolume(volume);
    } catch (error) {
      return this.handleError('setGlobalVolume', error);
    }
  }

  /**
   * Save mixer configuration
   * @param config - Mixer configuration
   */
  public async saveMixerConfig(config: MixerConfig): Promise<void> {
    try {
      await this.ipc.invoke('audio:saveMixerConfig', config.songPath, config);
    } catch (error) {
      return this.handleError('saveMixerConfig', error);
    }
  }

  /**
   * Load mixer configuration
   * @param songPath - Path to song folder
   * @returns Mixer configuration or null
   */
  public async loadMixerConfig(songPath: string): Promise<MixerConfig | null> {
    try {
      return await this.ipc.invoke('audio:loadMixerConfig', songPath) as MixerConfig | null;
    } catch (error) {
      this.logError('loadMixerConfig failed', error);
      return null;
    }
  }

  /**
   * Initialize audio service (connects to Node.js audio service)
   */
  public async initializeAudioService(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      await audioUtils.initializeAudioService();
      this.isInitialized = true;
      this.log('Audio service initialized');
    } catch (error) {
      return this.handleError('initializeAudioService', error);
    }
  }

  /**
   * Start audio service from app
   */
  public async startAudioService(): Promise<void> {
    try {
      await audioUtils.startAudioServiceFromApp();
      this.isInitialized = true;
      this.log('Audio service started');
    } catch (error) {
      return this.handleError('startAudioService', error);
    }
  }

  /**
   * Get memory usage statistics
   * @returns Memory statistics
   */
  public async getMemoryUsage(): Promise<MemoryUsage> {
    try {
      return await this.ipc.invoke('audio:getMemoryUsage') as MemoryUsage;
    } catch (error) {
      return this.handleError('getMemoryUsage', error);
    }
  }

  /**
   * Start memory monitoring
   * @param interval - Monitoring interval in milliseconds
   * @param callback - Callback to receive memory updates
   */
  public startMemoryMonitoring(interval: number, callback: (usage: MemoryUsage) => void): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    
    this.memoryMonitorInterval = setInterval(async () => {
      try {
        const usage = await this.getMemoryUsage();
        if (usage && callback) {
          callback(usage);
        }
      } catch (error) {
        this.logError('Failed to check memory usage', error);
      }
    }, interval);
  }

  /**
   * Stop memory monitoring
   */
  public stopMemoryMonitoring(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }
  }

  /**
   * Listen for playback position updates
   * @param callback - Callback receiving position
   */
  public onPositionUpdate(callback: (event: unknown, position: number) => void): void {
    this.ipc.on('audio:positionUpdate', ((...args: unknown[]) => {
      callback(args[0], args[1] as number);
    }));
  }

  /**
   * Listen for duration updates
   * @param callback - Callback receiving duration
   */
  public onDurationUpdate(callback: (event: unknown, duration: number) => void): void {
    this.ipc.on('audio:durationUpdate', ((...args: unknown[]) => {
      callback(args[0], args[1] as number);
    }));
  }

  /**
   * Listen for playback started event
   * @param callback - Callback for playback started
   */
  public onPlaybackStarted(callback: (event: unknown) => void): void {
    this.ipc.on('audio:playbackStarted', callback);
  }

  /**
   * Listen for playback stopped event
   * @param callback - Callback for playback stopped
   */
  public onPlaybackStopped(callback: (event: unknown) => void): void {
    this.ipc.on('audio:playbackStopped', callback);
  }

  /**
   * Listen for playback paused event
   * @param callback - Callback for playback paused
   */
  public onPlaybackPaused(callback: (event: unknown) => void): void {
    this.ipc.on('audio:playbackPaused', callback);
  }

  /**
   * Listen for transpose progress updates
   * @param callback - Callback receiving progress
   */
  public onTransposeProgress(callback: (event: unknown, progress: unknown) => void): void {
    this.ipc.on('audio:transposeProgress', ((...args: unknown[]) => {
      callback(args[0], args[1]);
    }));
  }

  /**
   * Listen for transpose complete event
   * @param callback - Callback receiving result
   */
  public onTransposeComplete(callback: (event: unknown, result: TransposeResult) => void): void {
    this.ipc.on('audio:transposeComplete', ((...args: unknown[]) => {
      callback(args[0], args[1] as TransposeResult);
    }));
  }

  /**
   * Listen for transpose error event
   * @param callback - Callback receiving error
   */
  public onTransposeError(callback: (event: unknown, error: Error) => void): void {
    this.ipc.on('audio:transposeError', ((...args: unknown[]) => {
      callback(args[0], args[1] as Error);
    }));
  }

  /**
   * Cleanup on dispose
   */
  protected override onDispose(): void {
    this.stopMemoryMonitoring();
    
    // Cleanup audio resources if needed
    audioUtils.cleanupAndStopAudio().catch((error: unknown) => {
      this.logError('Failed to cleanup audio', error);
    });
  }
}

export default AudioService;
