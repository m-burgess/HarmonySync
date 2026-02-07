/**
 * Timer ViewModel - Presentation logic for timer functionality
 * 
 * This ViewModel manages the state and business logic for timers.
 * It uses MobX for reactive state management and delegates operations to TimerService.
 * 
 * Key responsibilities:
 * - Manage timer collection and state
 * - Handle timer CRUD operations
 * - Manage timer countdown logic
 * - Handle display targeting
 * - Persist timers to storage
 * 
 * Views should only:
 * - Read observable properties
 * - Call action methods
 * - Never contain business logic
 */

import { makeObservable, observable, action, computed, runInAction } from 'mobx';
import { BaseViewModel } from '../base/BaseViewModel';
import type { Timer, Display } from '../types';

// Service interfaces
interface ITimerService {
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

interface IDisplayService {
  getDisplays(): Promise<Display[]>;
}

interface IIpcService {
  on(channel: string, callback: (...args: unknown[]) => void): () => void;
}

export interface ITimerViewModel {
  timers: Timer[];
  displays: Display[];
  selectedTimer: Timer | null;
  isLoading: boolean;
  error: string | null;
  showCreateModal: boolean;
  showEditModal: boolean;
  loadTimers(): Promise<void>;
  loadDisplays(): Promise<void>;
  createTimer(timer: Omit<Timer, 'id' | 'createdAt' | 'status'>): Promise<boolean>;
  updateTimer(id: string, updates: Partial<Timer>): Promise<boolean>;
  deleteTimer(id: string): Promise<boolean>;
  startTimer(id: string): Promise<void>;
  pauseTimer(id: string): Promise<void>;
  stopTimer(id: string): Promise<void>;
  resetTimer(id: string): Promise<void>;
  selectTimer(timer: Timer | null): void;
  openCreateModal(): void;
  closeCreateModal(): void;
  openEditModal(timer: Timer): void;
  closeEditModal(): void;
}

export class TimerViewModel extends BaseViewModel implements ITimerViewModel {
  protected readonly viewModelName = 'TimerViewModel';

  // Observable state
  public timers: Timer[] = [];
  public displays: Display[] = [];
  public selectedTimer: Timer | null = null;
  public isLoading: boolean = false;
  public error: string | null = null;
  public showCreateModal: boolean = false;
  public showEditModal: boolean = false;

  // Services
  private timerService: ITimerService;
  private displayService: IDisplayService;
  private ipcService: IIpcService;

  constructor(timerService: ITimerService, displayService: IDisplayService, ipcService: IIpcService) {
    super();
    this.timerService = timerService;
    this.displayService = displayService;
    this.ipcService = ipcService;

    makeObservable(this, {
      timers: observable,
      displays: observable,
      selectedTimer: observable,
      isLoading: observable,
      error: observable,
      showCreateModal: observable,
      showEditModal: observable,
      runningTimers: computed,
      hasTimers: computed,
      loadTimers: action,
      loadDisplays: action,
      createTimer: action,
      updateTimer: action,
      deleteTimer: action,
      startTimer: action,
      pauseTimer: action,
      stopTimer: action,
      resetTimer: action,
      selectTimer: action,
      openCreateModal: action,
      closeCreateModal: action,
      openEditModal: action,
      closeEditModal: action,
    });
  }

  /**
   * Initialize ViewModel
   */
  protected override async onInitialize(): Promise<void> {
    await Promise.all([
      this.loadTimers(),
      this.loadDisplays(),
    ]);

    // Listen for timer updates from backend
    this.addSubscription(
      this.ipcService.on('timer:updated', (...args: unknown[]) => {
        const timer = args[0] as Timer;
        runInAction(() => {
          const index = this.timers.findIndex(t => t.id === timer.id);
          if (index !== -1) {
            this.timers[index] = timer;
          }
        });
      })
    );
  }

  /**
   * Cleanup on dispose
   */
  protected override onDispose(): void {
    // Nothing to cleanup - backend manages timer intervals
  }

  // Computed properties
  public get runningTimers(): Timer[] {
    return this.timers.filter(t => t.status === 'running');
  }

  public get hasTimers(): boolean {
    return this.timers.length > 0;
  }

  // Actions: Load timers
  public async loadTimers(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const timers = await this.timerService.getAllTimers();

      runInAction(() => {
        this.timers = timers;
        this.isLoading = false;
      });
    } catch (error) {
      this.handleError('Load timers', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
        this.isLoading = false;
      });
    }
  }

  // Actions: Load displays
  public async loadDisplays(): Promise<void> {
    try {
      const displays = await this.displayService.getDisplays();
      runInAction(() => {
        this.displays = displays;
      });
    } catch (error) {
      this.handleError('Load displays', error);
    }
  }

  // Actions: CRUD operations
  public async createTimer(timer: Omit<Timer, 'id' | 'createdAt' | 'status'>): Promise<boolean> {
    this.isLoading = true;
    this.error = null;

    try {
      const newTimer = await this.timerService.createTimer(timer);

      runInAction(() => {
        this.timers.push(newTimer);
        this.showCreateModal = false;
        this.isLoading = false;
      });

      return true;
    } catch (error) {
      this.handleError('Create timer', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
        this.isLoading = false;
      });
      return false;
    }
  }

  public async updateTimer(id: string, updates: Partial<Timer>): Promise<boolean> {
    this.isLoading = true;
    this.error = null;

    try {
      const updatedTimer = await this.timerService.updateTimer(id, updates);

      runInAction(() => {
        const index = this.timers.findIndex(t => t.id === id);
        if (index !== -1) {
          this.timers[index] = updatedTimer;
        }
        this.showEditModal = false;
        this.selectedTimer = null;
        this.isLoading = false;
      });

      return true;
    } catch (error) {
      this.handleError('Update timer', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
        this.isLoading = false;
      });
      return false;
    }
  }

  public async deleteTimer(id: string): Promise<boolean> {
    this.isLoading = true;
    this.error = null;

    try {
      await this.timerService.deleteTimer(id);

      runInAction(() => {
        this.timers = this.timers.filter(t => t.id !== id);
        if (this.selectedTimer?.id === id) {
          this.selectedTimer = null;
        }
        this.isLoading = false;
      });

      return true;
    } catch (error) {
      this.handleError('Delete timer', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : String(error);
        this.isLoading = false;
      });
      return false;
    }
  }

  // Actions: Timer controls
  public async startTimer(id: string): Promise<void> {
    try {
      await this.timerService.startTimer(id);
      // Backend will send timer:updated event with new state
    } catch (error) {
      this.handleError('Start timer', error);
    }
  }

  public async pauseTimer(id: string): Promise<void> {
    try {
      await this.timerService.pauseTimer(id);
      // Backend will send timer:updated event with new state
    } catch (error) {
      this.handleError('Pause timer', error);
    }
  }

  public async stopTimer(id: string): Promise<void> {
    try {
      await this.timerService.stopTimer(id);
      // Backend will send timer:updated event with new state
    } catch (error) {
      this.handleError('Stop timer', error);
    }
  }

  public async resetTimer(id: string): Promise<void> {
    try {
      await this.timerService.resetTimer(id);
      // Backend will send timer:updated event with new state
    } catch (error) {
      this.handleError('Reset timer', error);
    }
  }

  // Actions: UI state management
  public selectTimer(timer: Timer | null): void {
    this.selectedTimer = timer;
  }

  public openCreateModal(): void {
    this.showCreateModal = true;
    this.error = null;
  }

  public closeCreateModal(): void {
    this.showCreateModal = false;
    this.error = null;
  }

  public openEditModal(timer: Timer): void {
    this.selectedTimer = timer;
    this.showEditModal = true;
    this.error = null;
  }

  public closeEditModal(): void {
    this.showEditModal = false;
    this.selectedTimer = null;
    this.error = null;
  }

  /**
   * Handle errors and update error state
   */
  protected override onError(_operation: string, errorMessage: string): void {
    this.error = errorMessage;
  }
}

export default TimerViewModel;
