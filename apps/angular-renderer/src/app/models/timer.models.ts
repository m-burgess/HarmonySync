export interface Timer {
    id: string;
    name: string;
    durationMinutes: number;
    targetDisplays: string[];
    createdAt: number;
    status: 'stopped' | 'running' | 'paused';
    remainingMs?: number;
    startedAt?: number;
}

export type CreateTimerRequest = Omit<Timer, 'id' | 'createdAt' | 'status'>;
