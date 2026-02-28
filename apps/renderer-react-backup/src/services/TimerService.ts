/**
 * Timer Service - Business logic for timer operations
 * 
 * This service abstracts all timer-related functionality including:
 * - Creating and managing timers
 * - Countdown logic and state management
 * - Timer persistence
 * - Display targeting
 * 
 * OOP Principles:
 * - Encapsulation: Private members for internal state
 * - Single Responsibility: Only handles timer operations
 * - Dependency Injection: Depends on IpcService abstraction
 * - Interface Segregation: Implements ITimerService
 */

import { BaseService } from '../base/BaseService';
import type { IIpcService } from '../types/services';
import type { Timer } from '../types';

/**
 * Timer Service Interface
 */
export interface ITimerService {
  getAllTimers(): Promise<Timer[]>;
  getTimer(id: string): Promise<Timer | null>;
  createTimer(timer: Omit<Timer, 'id' | 'createdAt' | 'status'>): Promise<Timer>;
  updateTimer(id: string, updates: Partial<Timer>): Promise<Timer>;
  deleteTimer(id: string): Promise<void>;
  startTimer(id: string): Promise<void>;
  pauseTimer(id: string): Promise<void>;
  stopTimer(id: string): Promise<void>;
  resetTimer(id: string): Promise<void>;
}

/**
 * Timer Service Implementation
 */
export class TimerService extends BaseService implements ITimerService {
  protected readonly serviceName = 'TimerService';
  
  private readonly ipc: IIpcService;

  /**
   * Constructor
   * @param ipcService - IPC service for communication with main process
   */
  constructor(ipcService: IIpcService) {
    super();
    this.ipc = ipcService;
  }

  /**
   * Get all timers
   * @returns Array of all timers
   */
  public async getAllTimers(): Promise<Timer[]> {
    try {
      return await this.ipc.invoke('timer:getAll') as Timer[];
    } catch (error) {
      return this.handleError('getAllTimers', error);
    }
  }

  /**
   * Get a specific timer by ID
   * @param id - Timer ID
   * @returns Timer or null if not found
   */
  public async getTimer(id: string): Promise<Timer | null> {
    try {
      return await this.ipc.invoke('timer:get', id) as Timer | null;
    } catch (error) {
      this.logError('getTimer failed', error);
      return null;
    }
  }

  /**
   * Create a new timer
   * @param timer - Timer data without id, createdAt, and status
   * @returns Created timer
   */
  public async createTimer(timer: Omit<Timer, 'id' | 'createdAt' | 'status'>): Promise<Timer> {
    try {
      return await this.ipc.invoke('timer:create', timer) as Timer;
    } catch (error) {
      return this.handleError('createTimer', error);
    }
  }

  /**
   * Update an existing timer
   * @param id - Timer ID
   * @param updates - Partial timer updates
   * @returns Updated timer
   */
  public async updateTimer(id: string, updates: Partial<Timer>): Promise<Timer> {
    try {
      return await this.ipc.invoke('timer:update', id, updates) as Timer;
    } catch (error) {
      return this.handleError('updateTimer', error);
    }
  }

  /**
   * Delete a timer
   * @param id - Timer ID
   */
  public async deleteTimer(id: string): Promise<void> {
    try {
      await this.ipc.invoke('timer:delete', id);
    } catch (error) {
      return this.handleError('deleteTimer', error);
    }
  }

  /**
   * Start a timer countdown
   * @param id - Timer ID
   */
  public async startTimer(id: string): Promise<void> {
    try {
      await this.ipc.invoke('timer:start', id);
    } catch (error) {
      return this.handleError('startTimer', error);
    }
  }

  /**
   * Pause a running timer
   * @param id - Timer ID
   */
  public async pauseTimer(id: string): Promise<void> {
    try {
      await this.ipc.invoke('timer:pause', id);
    } catch (error) {
      return this.handleError('pauseTimer', error);
    }
  }

  /**
   * Stop a timer (resets to initial duration)
   * @param id - Timer ID
   */
  public async stopTimer(id: string): Promise<void> {
    try {
      await this.ipc.invoke('timer:stop', id);
    } catch (error) {
      return this.handleError('stopTimer', error);
    }
  }

  /**
   * Reset a timer to its initial duration
   * @param id - Timer ID
   */
  public async resetTimer(id: string): Promise<void> {
    try {
      await this.ipc.invoke('timer:reset', id);
    } catch (error) {
      return this.handleError('resetTimer', error);
    }
  }
}

export default TimerService;
