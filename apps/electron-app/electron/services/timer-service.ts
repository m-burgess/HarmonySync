/**
 * Timer Service - Backend timer management
 * 
 * Manages timer state, persistence, and countdown logic on the backend
 */

import * as path from 'path';
import { app } from 'electron';

interface Timer {
  id: string;
  name: string;
  durationMinutes: number;
  targetDisplays: string[];
  createdAt: number;
  status: 'stopped' | 'running' | 'paused';
  remainingMs?: number;
  startedAt?: number;
}

class TimerService {
  private timers: Map<string, Timer> = new Map();
  private timerIntervals: Map<string, NodeJS.Timeout> = new Map();
  private jsonStorage: any;
  private onTimerUpdate?: (timer: Timer) => void;

  constructor(jsonStorage: any) {
    this.jsonStorage = jsonStorage;
  }

  /**
   * Set callback for timer updates
   */
  public setUpdateCallback(callback: (timer: Timer) => void): void {
    this.onTimerUpdate = callback;
  }

  /**
   * Initialize service and load timers from storage
   */
  public async initialize(): Promise<void> {
    await this.loadTimers();
  }

  /**
   * Load timers from persistent storage
   */
  private async loadTimers(): Promise<void> {
    try {
      const timers = await this.jsonStorage.read('timers');
      if (Array.isArray(timers)) {
        timers.forEach((timer: Timer) => {
          // Reset all timers to stopped state on load
          timer.status = 'stopped';
          timer.remainingMs = timer.durationMinutes * 60 * 1000;
          this.timers.set(timer.id, timer);
        });
      }
    } catch (error) {
      console.error('Failed to load timers:', error);
    }
  }

  /**
   * Save timers to persistent storage
   */
  private async saveTimers(): Promise<void> {
    try {
      const timersArray = Array.from(this.timers.values());
      await this.jsonStorage.write('timers', timersArray);
    } catch (error) {
      console.error('Failed to save timers:', error);
      throw error;
    }
  }

  /**
   * Get all timers
   */
  public async getAllTimers(): Promise<Timer[]> {
    return Array.from(this.timers.values());
  }

  /**
   * Get a specific timer
   */
  public async getTimer(id: string): Promise<Timer | null> {
    return this.timers.get(id) || null;
  }

  /**
   * Create a new timer
   */
  public async createTimer(timerData: Omit<Timer, 'id' | 'createdAt' | 'status'>): Promise<Timer> {
    const id = `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timer: Timer = {
      ...timerData,
      id,
      createdAt: Date.now(),
      status: 'stopped',
      remainingMs: timerData.durationMinutes * 60 * 1000,
    };

    this.timers.set(id, timer);
    await this.saveTimers();

    return timer;
  }

  /**
   * Update an existing timer
   */
  public async updateTimer(id: string, updates: Partial<Timer>): Promise<Timer> {
    const timer = this.timers.get(id);
    if (!timer) {
      throw new Error(`Timer ${id} not found`);
    }

    // Prevent updating certain fields
    const { id: _, createdAt: __, ...allowedUpdates } = updates as any;

    Object.assign(timer, allowedUpdates);

    // Recalculate remainingMs if duration changed and timer is stopped
    if (updates.durationMinutes && timer.status === 'stopped') {
      timer.remainingMs = timer.durationMinutes * 60 * 1000;
    }

    await this.saveTimers();

    return timer;
  }

  /**
   * Delete a timer
   */
  public async deleteTimer(id: string): Promise<void> {
    const timer = this.timers.get(id);
    if (!timer) {
      throw new Error(`Timer ${id} not found`);
    }

    // Stop timer if running
    if (timer.status === 'running') {
      this.stopTimer(id);
    }

    this.timers.delete(id);
    await this.saveTimers();
  }

  /**
   * Start a timer
   */
  public async startTimer(id: string): Promise<void> {
    const timer = this.timers.get(id);
    if (!timer) {
      throw new Error(`Timer ${id} not found`);
    }

    if (timer.status === 'running') {
      return; // Already running
    }

    timer.status = 'running';
    timer.startedAt = Date.now();

    // If paused, we already have remainingMs
    // If stopped, use full duration
    if (!timer.remainingMs) {
      timer.remainingMs = timer.durationMinutes * 60 * 1000;
    }

    this.startTimerInterval(id);
    this.notifyUpdate(timer);
  }

  /**
   * Pause a timer
   */
  public async pauseTimer(id: string): Promise<void> {
    const timer = this.timers.get(id);
    if (!timer) {
      throw new Error(`Timer ${id} not found`);
    }

    if (timer.status !== 'running') {
      return; // Not running
    }

    // Calculate remaining time
    if (timer.startedAt) {
      const elapsed = Date.now() - timer.startedAt;
      timer.remainingMs = Math.max(0, (timer.remainingMs || 0) - elapsed);
    }

    timer.status = 'paused';
    this.stopTimerInterval(id);
    this.notifyUpdate(timer);
  }

  /**
   * Stop a timer (resets to initial duration)
   */
  public async stopTimer(id: string): Promise<void> {
    const timer = this.timers.get(id);
    if (!timer) {
      throw new Error(`Timer ${id} not found`);
    }

    timer.status = 'stopped';
    timer.remainingMs = timer.durationMinutes * 60 * 1000;
    timer.startedAt = undefined;

    this.stopTimerInterval(id);
    this.notifyUpdate(timer);
  }

  /**
   * Reset a timer to its initial duration
   */
  public async resetTimer(id: string): Promise<void> {
    const timer = this.timers.get(id);
    if (!timer) {
      throw new Error(`Timer ${id} not found`);
    }

    const wasRunning = timer.status === 'running';

    timer.remainingMs = timer.durationMinutes * 60 * 1000;
    
    if (wasRunning) {
      timer.startedAt = Date.now();
      this.startTimerInterval(id);
    }

    this.notifyUpdate(timer);
  }

  /**
   * Start countdown interval for a timer
   */
  private startTimerInterval(id: string): void {
    // Clear existing interval
    this.stopTimerInterval(id);

    const interval = setInterval(() => {
      const timer = this.timers.get(id);
      if (!timer || timer.status !== 'running') {
        this.stopTimerInterval(id);
        return;
      }

      if (timer.startedAt) {
        const elapsed = Date.now() - timer.startedAt;
        const totalMs = timer.durationMinutes * 60 * 1000;
        timer.remainingMs = Math.max(0, totalMs - elapsed);

        this.notifyUpdate(timer);

        // Auto-stop when time is up
        if (timer.remainingMs === 0) {
          this.stopTimer(id);
        }
      }
    }, 1000); // Update every second

    this.timerIntervals.set(id, interval);
  }

  /**
   * Stop countdown interval for a timer
   */
  private stopTimerInterval(id: string): void {
    const interval = this.timerIntervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.timerIntervals.delete(id);
    }
  }

  /**
   * Notify listeners of timer update
   */
  private notifyUpdate(timer: Timer): void {
    if (this.onTimerUpdate) {
      this.onTimerUpdate(timer);
    }
  }

  /**
   * Cleanup on shutdown
   */
  public cleanup(): void {
    // Stop all timers
    this.timerIntervals.forEach((interval) => clearInterval(interval));
    this.timerIntervals.clear();
  }
}

// Export singleton instance
let timerService: TimerService | null = null;

export function getTimerService(jsonStorage: any): TimerService {
  if (!timerService) {
    timerService = new TimerService(jsonStorage);
  }
  return timerService;
}

export default TimerService;
