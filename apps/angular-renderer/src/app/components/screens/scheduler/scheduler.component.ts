import { Component, OnInit, OnDestroy, inject, signal, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { AppSettings, ServiceTime } from '../../../models/config.models';
import {
    heroPlus,
    heroTrash,
    heroXMark,
    heroCalendarDays,
    heroClock,
    heroBolt,
    heroArrowPath,
    heroListBullet
} from '@ng-icons/heroicons/outline';
import { ElectronService } from '../../../core/electron.service';
import { ServiceOrderService } from '../../../core/service-order.service';
import { SlideService } from '../../../core/slide.service';
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
        <div class="w-full space-y-10">
            @if (localSettings) {
                <!-- Automated Flows -->
                <section>
                    <div class="flex items-center space-x-3 mb-6">
                        <div class="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400 shadow-inner">
                            <ng-icon name="heroArrowPath" class="text-lg"></ng-icon>
                        </div>
                        <h3 class="text-sm font-bold uppercase tracking-widest text-slate-200">Automated Flows</h3>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800/60 shadow-xl shadow-black/20">
                        <div class="flex flex-col space-y-2">
                            <label class="text-xs font-semibold text-slate-400 tracking-wide uppercase">Pre-Service Playlist Start</label>
                            <input type="time" [(ngModel)]="localSettings.preServicePlaylistStartTime" (ngModelChange)="onMarkDirty()"
                                   class="w-full bg-slate-950/50 border border-slate-700/50 hover:border-indigo-500/50 text-slate-200 text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner">
                        </div>

                        <div class="flex flex-col space-y-2">
                            <label class="text-xs font-semibold text-slate-400 tracking-wide uppercase">Countdown Video Start</label>
                            <input type="time" [(ngModel)]="localSettings.countdownVideoStartTime" (ngModelChange)="onMarkDirty()"
                                   class="w-full bg-slate-950/50 border border-slate-700/50 hover:border-indigo-500/50 text-slate-200 text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner">
                        </div>
                    </div>
                </section>

                <!-- Service List -->
                <section>
                    <div class="flex items-center justify-between mb-6">
                        <div class="flex items-center space-x-3">
                            <div class="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-cyan-400 shadow-inner">
                                <ng-icon name="heroListBullet" class="text-lg"></ng-icon>
                            </div>
                            <h3 class="text-sm font-bold uppercase tracking-widest text-slate-200">Service Schedule</h3>
                        </div>
                        <button (click)="addService()" 
                                class="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center transition-all group active:scale-95 shadow-inner">
                            <ng-icon name="heroPlus" class="mr-1.5 group-hover:scale-125 transition-transform"></ng-icon>Add Time
                        </button>
                    </div>

                    <div class="space-y-4">
                        @for (service of localSettings.serviceTimes; track service.id; let i = $index) {
                            <div class="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/60 hover:border-slate-700/80 relative transition-all duration-300 group/card shadow-xl shadow-black/10 hover:shadow-cyan-900/10">
                                <button (click)="removeService(i)" 
                                        class="absolute -top-3 -right-3 bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 hover:border-rose-500/30 p-2 rounded-full opacity-0 group-hover/card:opacity-100 transition-all shadow-lg z-10 border border-slate-700/50">
                                    <ng-icon name="heroTrash" class="text-sm"></ng-icon>
                                </button>
                                
                                <div class="space-y-5">
                                    <div class="relative">
                                        <input [(ngModel)]="service.name" (ngModelChange)="onMarkDirty()"
                                               placeholder="Service Type (e.g. Traditional)"
                                               class="bg-transparent border-none text-slate-100 text-base font-bold p-0 w-full focus:ring-0 placeholder-slate-600 outline-none">
                                        <div class="h-0.5 w-12 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full mt-2"></div>
                                    </div>
                                    
                                    <div class="grid grid-cols-2 gap-5">
                                        <div class="space-y-2">
                                            <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Window</label>
                                            <input type="time" [(ngModel)]="service.startTime" (ngModelChange)="onMarkDirty()"
                                                   class="bg-slate-950/50 border border-slate-700/50 hover:border-cyan-500/50 text-slate-200 text-sm px-3 py-2 rounded-xl w-full focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 outline-none transition-all shadow-inner">
                                        </div>
                                        <div class="space-y-2">
                                            <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">End Window</label>
                                            <input type="time" [(ngModel)]="service.endTime" (ngModelChange)="onMarkDirty()"
                                                   class="bg-slate-950/50 border border-slate-700/50 hover:border-cyan-500/50 text-slate-200 text-sm px-3 py-2 rounded-xl w-full focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 outline-none transition-all shadow-inner">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        }
                    </div>
                </section>
            }

            <!-- Add New Event -->
            <section>
                <div class="flex items-center space-x-3 mb-6">
                    <div class="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400 shadow-inner">
                        <ng-icon name="heroPlus" class="text-lg"></ng-icon>
                    </div>
                    <h3 class="text-sm font-bold uppercase tracking-widest text-slate-200">New Event</h3>
                </div>
                
                <div class="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800/60 shadow-xl shadow-black/20 space-y-6">
                    <div class="flex flex-col space-y-2">
                        <label class="text-xs font-semibold text-slate-400 tracking-wide uppercase">Action / Macro</label>
                        <select [(ngModel)]="newEvent.macroId" 
                                class="w-full bg-slate-950/50 border border-slate-700/50 hover:border-indigo-500/50 text-slate-200 text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-inner outline-none">
                            <option value="">-- Select Macro --</option>
                            <optgroup label="Automation">
                                @for (macro of macros; track macro.id) {
                                    <option [value]="macro.id">{{ macro.name }}</option>
                                }
                            </optgroup>
                        </select>
                    </div>

                    <div class="grid grid-cols-2 gap-5">
                        <div class="flex flex-col space-y-2">
                            <label class="text-xs font-semibold text-slate-400 tracking-wide uppercase">Day</label>
                            <select [(ngModel)]="newEvent.day"
                                    class="w-full bg-slate-950/50 border border-slate-700/50 hover:border-indigo-500/50 text-slate-200 text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-inner outline-none">
                                @for (day of daysOfWeek; track day) {
                                    <option [value]="day">{{ day.substring(0,3) }}</option>
                                }
                            </select>
                        </div>

                        <div class="flex flex-col space-y-2">
                            <label class="text-xs font-semibold text-slate-400 tracking-wide uppercase">Time</label>
                            <input type="time" [(ngModel)]="newEvent.time"
                                   class="w-full bg-slate-950/50 border border-slate-700/50 hover:border-indigo-500/50 text-slate-200 text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-inner outline-none">
                        </div>
                    </div>

                    <button (click)="addScheduledEvent()" 
                            [disabled]="!newEvent.macroId"
                            class="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-indigo-900/30 py-3 rounded-xl font-semibold flex items-center justify-center transition-all active:scale-95 duration-200">
                        <ng-icon name="heroPlus" class="mr-2 text-lg"></ng-icon> Add Event
                    </button>
                </div>
            </section>

            <!-- List of Events -->
            <section>
                <div class="flex items-center space-x-3 mb-6">
                    <div class="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400 shadow-inner">
                        <ng-icon name="heroClock" class="text-lg"></ng-icon>
                    </div>
                    <h3 class="text-sm font-bold uppercase tracking-widest text-slate-200">Active Schedule</h3>
                </div>
                
                @if (scheduledEvents().length === 0) {
                    <div class="py-12 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/60 border-dashed flex flex-col items-center justify-center text-slate-500 shadow-xl shadow-black/10">
                        <p class="text-sm">No events scheduled.</p>
                    </div>
                } @else {
                    <div class="space-y-4">
                        @for (event of scheduledEvents(); track event.id) {
                            <div class="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/60 hover:border-emerald-500/30 transition-all duration-300 group flex items-center justify-between shadow-xl shadow-black/10">
                                <div class="flex items-center space-x-4">
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" [checked]="event.enabled" (change)="toggleEvent(event)" class="sr-only peer">
                                        <div class="w-10 h-5.5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                                    </label>
                                    
                                    <div [class.opacity-50]="!event.enabled" class="overflow-hidden transition-opacity">
                                        <div class="text-sm font-bold text-slate-100 truncate">{{ event.macroName }}</div>
                                        <div class="text-xs text-slate-500 mt-1">
                                            <span class="text-emerald-400 font-medium">{{ event.day?.substring(0,3) }}</span> 
                                            <span class="mx-2">•</span> 
                                            <span class="text-slate-300">{{ event.time }}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <button (click)="deleteEvent(event.id)" 
                                        class="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-rose-500/20 shadow-sm">
                                    <ng-icon name="heroTrash" class="text-lg"></ng-icon>
                                </button>
                            </div>
                        }
                    </div>
                }
            </section>

            <!-- Weekly Overview -->
            <section>
                <div class="flex items-center space-x-3 mb-6">
                    <div class="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-cyan-400 shadow-inner">
                        <ng-icon name="heroCalendarDays" class="text-lg"></ng-icon>
                    </div>
                    <h3 class="text-sm font-bold uppercase tracking-widest text-slate-200">Weekly Overview</h3>
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    @for (day of daysOfWeek; track day) {
                        @if (getEventsForDay(day).length > 0) {
                            <div class="flex flex-col bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/60 overflow-hidden shadow-xl shadow-black/10 transition-all hover:border-cyan-500/30">
                                <div class="bg-slate-950/50 px-4 py-2.5 border-b border-slate-800/50 text-xs font-bold text-slate-300 uppercase tracking-widest">
                                    {{ day }}
                                </div>
                                <div class="p-3 space-y-2">
                                    @for (event of getEventsForDay(day); track event.id) {
                                        <div class="text-[10px] bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-700/50 text-slate-200 flex justify-between items-center shadow-inner">
                                            <span class="truncate pr-2 font-medium">{{ event.macroName }}</span>
                                            <span class="text-cyan-400 font-mono shrink-0 bg-cyan-500/10 px-1.5 py-0.5 rounded">{{ event.time }}</span>
                                        </div>
                                    }
                                </div>
                            </div>
                        }
                    }
                </div>
            </section>

            <!-- Footer Note -->
            <div class="pt-6 flex flex-col items-center justify-center opacity-60">
                <div class="text-xs text-slate-400 font-medium italic">
                    Schedulers run locally. Keep app open.
                </div>
                <div class="text-[10px] font-mono text-cyan-400/80 uppercase mt-1">
                    Sys-Clock: Verified
                </div>
            </div>
        </div>
    `,
    styles: [`
        .h-5\\.5 { height: 1.375rem; }
        .w-10 { width: 2.5rem; }
        .h-4\\.5 { height: 1.125rem; }
        .w-4\\.5 { width: 1.125rem; }
    `],
    providers: [
        provideIcons({
            heroPlus,
            heroTrash,
            heroXMark,
            heroCalendarDays,
            heroClock,
            heroBolt,
            heroArrowPath,
            heroListBullet
        })
    ]
})
export class SchedulerComponent implements OnInit, OnDestroy {
    private readonly electron = inject(ElectronService);
    private readonly serviceOrder = inject(ServiceOrderService);
    private readonly slideService = inject(SlideService);

    @Input() localSettings: AppSettings | null = null;
    @Output() markDirty = new EventEmitter<void>();

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

        // Global scheduled events
        this.scheduledEvents().forEach(event => {
            if (event.enabled && event.day === currentDay && event.time === currentTime) {
                this.executeEvent(event);
            }
        });

        // Folder schedule events
        const folderEvents = this.serviceOrder.folderScheduleEvents();
        if (folderEvents && folderEvents.length > 0) {
            folderEvents.forEach(event => {
                const triggerType = event.trigger || 'time';
                if (triggerType === 'time' && event.time === currentTime) {
                    this.serviceOrder.executeFolderEvent(event);
                }
            });
        }
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

    onMarkDirty() {
        this.markDirty.emit();
    }

    addService() {
        if (!this.localSettings) return;
        this.localSettings.serviceTimes.push({
            id: `service_${Date.now()}`,
            name: 'New Service',
            startTime: '09:00',
            endTime: '11:00'
        });
        this.onMarkDirty();
    }

    removeService(index: number) {
        if (!this.localSettings) return;
        this.localSettings.serviceTimes.splice(index, 1);
        this.onMarkDirty();
    }
}
