import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
    heroPlus,
    heroTrash,
    heroXMark,
    heroCalendarDays,
    heroClock,
    heroBolt
} from '@ng-icons/heroicons/outline';
import { ElectronService } from '../../../core/electron.service';
import commonMacros from '../../../data/common_macros.json';

export type RecurrenceType = 'one-time' | 'daily' | 'weekly' | 'monthly';

export interface ScheduledEvent {
    id: number;
    name?: string;
    type?: string;
    macroId?: string;
    macroName?: string;
    day?: string;
    date?: string;
    time?: string;
    recurring?: boolean;
    enabled?: boolean;
    recurrenceType?: RecurrenceType;
    actionType?: 'macro' | 'script';
    scriptId?: string;
}

@Component({
    selector: 'app-scheduler',
    standalone: true,
    imports: [CommonModule, FormsModule, NgIconComponent],
    template: `
    <div class="scheduler-sidebar flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] overflow-hidden select-none">
        <!-- Header -->
        <div class="p-4 bg-[#252526] border-b border-[#3c3c3c] flex items-center justify-between shadow-sm z-20">
            <div class="flex items-center space-x-2">
                <ng-icon name="heroCalendarDays" class="text-[#007acc] text-lg"></ng-icon>
                <h2 class="text-xs font-bold uppercase tracking-wider text-[#e1e1e1]">Scheduler</h2>
            </div>
        </div>

        <div class="flex-1 overflow-auto custom-scrollbar p-4 space-y-6">
            
            <!-- Add New Event -->
            <section class="bg-[#252526] p-4 rounded-md border border-[#333333] shadow-sm">
                <h3 class="text-[10px] font-bold uppercase tracking-widest text-[#858585] mb-4 flex items-center">
                    <ng-icon name="heroPlus" class="mr-2"></ng-icon> New Event
                </h3>
                
                <div class="flex flex-col space-y-4">
                    <div class="flex flex-col space-y-1.5">
                        <label class="text-[10px] font-medium text-[#969696]">Action / Macro</label>
                        <select [(ngModel)]="newEvent.macroId" 
                                class="bg-[#3c3c3c] border border-[#444444] text-[#e1e1e1] text-xs px-2.5 py-2 rounded focus:border-[#007acc] outline-none">
                            <option value="">-- Select Macro --</option>
                            <optgroup label="Automation">
                                @for (macro of macros; track macro.id) {
                                    <option [value]="macro.id">{{ macro.name }}</option>
                                }
                            </optgroup>
                        </select>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="flex flex-col space-y-1.5">
                            <label class="text-[10px] font-medium text-[#969696]">Day</label>
                            <select [(ngModel)]="newEvent.day"
                                    class="bg-[#3c3c3c] border border-[#444444] text-[#e1e1e1] text-xs px-2 py-2 rounded focus:border-[#007acc] outline-none">
                                @for (day of daysOfWeek; track day) {
                                    <option [value]="day">{{ day.substring(0,3) }}</option>
                                }
                            </select>
                        </div>

                        <div class="flex flex-col space-y-1.5">
                            <label class="text-[10px] font-medium text-[#969696]">Time</label>
                            <input type="time" [(ngModel)]="newEvent.time"
                                   class="bg-[#3c3c3c] border border-[#444444] text-[#e1e1e1] text-xs px-2 py-2 rounded focus:border-[#007acc] outline-none">
                        </div>
                    </div>

                    <button (click)="addScheduledEvent()" 
                            [disabled]="!newEvent.macroId"
                            class="w-full bg-[#007acc] hover:bg-[#005a9e] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-bold py-2 px-4 rounded shadow-sm transition-all active:scale-95 flex items-center justify-center">
                        <ng-icon name="heroPlus" class="mr-2"></ng-icon> Add Event
                    </button>
                </div>
            </section>

            <!-- List of Events -->
            <section>
                <h3 class="text-[10px] font-bold uppercase tracking-widest text-[#858585] mb-4 flex items-center">
                    <ng-icon name="heroClock" class="mr-2"></ng-icon> Active Schedule
                </h3>
                
                @if (scheduledEvents().length === 0) {
                    <div class="py-12 bg-[#252526] rounded-md border border-[#333333] border-dashed flex flex-col items-center justify-center text-[#666666]">
                        <p class="text-[10px]">No events scheduled.</p>
                    </div>
                } @else {
                    <div class="space-y-2">
                        @for (event of scheduledEvents(); track event.id) {
                            <div class="bg-[#252526] p-3 rounded-md border border-[#333333] hover:border-[#454545] transition-all group flex items-center justify-between shadow-sm">
                                <div class="flex items-center space-x-3">
                                    <input type="checkbox" [checked]="event.enabled" (change)="toggleEvent(event)" 
                                           class="w-3 h-3 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500">
                                    
                                    <div [class.opacity-50]="!event.enabled" class="overflow-hidden">
                                        <div class="text-[10px] font-bold text-[#e1e1e1] truncate">{{ event.macroName }}</div>
                                        <div class="text-[9px] text-[#858585]">
                                            <span class="text-blue-400">{{ event.day?.substring(0,3) }}</span> 
                                            <span class="mx-1">•</span> 
                                            <span class="text-amber-400">{{ event.time }}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <button (click)="deleteEvent(event.id)" 
                                        class="text-[#858585] hover:text-red-400 p-1.5 transition-colors opacity-0 group-hover:opacity-100">
                                    <ng-icon name="heroTrash" class="text-xs"></ng-icon>
                                </button>
                            </div>
                        }
                    </div>
                }
            </section>

            <!-- Weekly Overview (Vertical) -->
            <section>
                <h3 class="text-[10px] font-bold uppercase tracking-widest text-[#858585] mb-4 flex items-center">
                    <ng-icon name="heroBolt" class="mr-2"></ng-icon> Weekly Overview
                </h3>
                
                <div class="space-y-2">
                    @for (day of daysOfWeek; track day) {
                        @if (getEventsForDay(day).length > 0) {
                            <div class="flex flex-col bg-[#252526] rounded border border-[#333333] overflow-hidden">
                                <div class="bg-[#333333] px-2 py-1 text-[9px] font-bold text-[#aaa] uppercase tracking-tighter">
                                    {{ day }}
                                </div>
                                <div class="p-1.5 space-y-1">
                                    @for (event of getEventsForDay(day); track event.id) {
                                        <div class="text-[9px] bg-[#3c3c3c] px-2 py-0.5 rounded border-l-2 border-[#007acc] text-[#ccc] flex justify-between">
                                            <span class="truncate pr-2">{{ event.macroName }}</span>
                                            <span class="text-[#888] font-mono shrink-0">{{ event.time }}</span>
                                        </div>
                                    }
                                </div>
                            </div>
                        }
                    }
                </div>
            </section>
        </div>
        
        <!-- Footer -->
        <div class="p-3 bg-[#252526] border-t border-[#3c3c3c] flex flex-col space-y-0.5 px-6">
            <div class="text-[9px] text-[#858585] italic">
                Schedulers run locally. Keep app open.
            </div>
            <div class="text-[8px] font-mono text-indigo-400/60 uppercase">
                Sys-Clock: Verified
            </div>
        </div>
    </div>
  `,
    styles: [`
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #444444;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .animate-spin-slow {
        animation: spin 8s linear infinite;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
  `],
    providers: [
        provideIcons({
            heroPlus,
            heroTrash,
            heroXMark,
            heroCalendarDays,
            heroClock,
            heroBolt
        })
    ]
})
export class SchedulerComponent implements OnInit, OnDestroy {
    private readonly electron = inject(ElectronService);

    readonly daysOfWeek = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
    ];

    readonly macros = commonMacros;

    scheduledEvents = signal<ScheduledEvent[]>([]);

    newEvent: Partial<ScheduledEvent> = {
        day: 'Sunday',
        time: '09:00',
        enabled: true,
        recurring: true
    };

    private checkInterval: any;

    ngOnInit() {
        this.loadEvents();
        this.startScheduler();
    }

    ngOnDestroy() {
        this.stopScheduler();
    }

    async loadEvents() {
        try {
            const events = await this.electron.invoke('scheduler:getAllEvents');
            this.scheduledEvents.set(Array.isArray(events) ? events : []);
        } catch (error) {
            console.error('Failed to load scheduled events:', error);
        }
    }

    startScheduler() {
        this.stopScheduler();
        this.checkInterval = setInterval(() => this.checkSchedule(), 60000);
        // Initial check
        this.checkSchedule();
    }

    stopScheduler() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }

    private checkSchedule() {
        const now = new Date();
        const currentDay = this.daysOfWeek[now.getDay()];
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        this.scheduledEvents().forEach(event => {
            if (event.enabled && event.day === currentDay && event.time === currentTime) {
                this.executeEvent(event);
            }
        });
    }

    private async executeEvent(event: ScheduledEvent) {
        if (!event.macroId) return;

        const macro = this.macros.find(m => m.id === event.macroId);
        if (!macro) return;

        console.log(`[Scheduler] Triggering macro: ${macro.name}`);

        try {
            await this.electron.invoke('execute_macro', {
                macroId: macro.id,
                macroAction: macro.action,
                midiNote: (macro as any).midiNote
            });
        } catch (error) {
            console.error(`[Scheduler] Failed to execute macro ${macro.name}:`, error);
        }
    }

    async addScheduledEvent() {
        if (!this.newEvent.macroId) return;

        const macro = this.macros.find(m => m.id === this.newEvent.macroId);

        const event: ScheduledEvent = {
            id: Date.now(),
            macroId: this.newEvent.macroId,
            macroName: macro?.name || 'Unknown Macro',
            day: this.newEvent.day,
            time: this.newEvent.time,
            enabled: true,
            recurring: true,
            type: 'macro'
        };

        try {
            await this.electron.invoke('scheduler:create', event);
            this.scheduledEvents.update(events => [...events, event]);

            // Reset form partly
            this.newEvent.macroId = '';
        } catch (error) {
            console.error('Failed to create scheduled event:', error);
        }
    }

    async deleteEvent(id: number) {
        try {
            await this.electron.invoke('scheduler:delete', { id });
            this.scheduledEvents.update(events => events.filter(e => e.id !== id));
        } catch (error) {
            console.error('Failed to delete scheduled event:', error);
        }
    }

    async toggleEvent(event: ScheduledEvent) {
        const updatedEvent = { ...event, enabled: !event.enabled };
        try {
            await this.electron.invoke('scheduler:update', updatedEvent);
            this.scheduledEvents.update(events =>
                events.map(e => e.id === event.id ? updatedEvent : e)
            );
        } catch (error) {
            console.error('Failed to toggle scheduled event:', error);
        }
    }

    getEventsForDay(day: string) {
        return this.scheduledEvents().filter(e => e.day === day && e.enabled);
    }

    close() {
        // This component is intended to be used with @if in the parent template
        // but we can also emit an event if needed. We'll rely on the parent's control.
        this.electron.send('close-scheduler');
    }
}
