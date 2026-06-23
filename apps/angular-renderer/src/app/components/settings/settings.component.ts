import { Component, inject, OnInit, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { ConfigService } from '../../core/config.service';
import { AppSettings, ServiceTime } from '../../models/config.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
    heroPlus,
    heroTrash,
    heroCheck,
    heroArrowPath,
    heroEye,
    heroSwatch,
    heroAdjustmentsHorizontal,
    heroListBullet,
    heroComputerDesktop,
    heroArrowsPointingOut,
    heroSpeakerWave,
    heroMusicalNote,
    heroMicrophone,
    heroXMark,
    heroCalendarDays
} from '@ng-icons/heroicons/outline';
import { ElectronService } from '../../core/electron.service';
import { SchedulerComponent } from '../screens/scheduler/scheduler.component';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, FormsModule, NgIconComponent, SchedulerComponent],
    template: `
    <div class="flex h-full bg-black text-slate-300 select-none font-sans overflow-hidden relative rounded-2xl border border-slate-700 shadow-2xl">
      <!-- Subtle Gradient Background Element -->
      <div class="absolute inset-0 z-0 opacity-30 pointer-events-none overflow-hidden">
         <div class="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-indigo-900/40 blur-[120px]"></div>
         <div class="absolute bottom-[-20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-cyan-900/20 blur-[120px]"></div>
      </div>

      <!-- Sidebar Navigation -->
      <div class="w-64 bg-slate-900/40 backdrop-blur-xl border-r border-slate-800/50 flex flex-col z-10 shadow-2xl">
         <!-- Header Title -->
         <div class="p-6 pb-8 flex items-center justify-between">
            <h2 class="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Settings</h2>
            <button (click)="close()" class="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-colors border border-transparent hover:border-slate-700/50">
                <ng-icon name="heroXMark" class="text-xl"></ng-icon>
            </button>
         </div>
         
         <!-- Nav Items -->
         <div class="flex flex-col px-3 space-y-1.5">
            <button (click)="activeTab = 'general'"
                    [class]="activeTab === 'general' ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 shadow-inner' : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                    class="flex items-center space-x-3 px-4 py-3 rounded-xl border transition-all duration-300 font-medium">
                 <ng-icon name="heroAdjustmentsHorizontal" class="text-lg"></ng-icon>
                 <span class="text-sm">General</span>
            </button>
            <button (click)="activeTab = 'displays'"
                    [class]="activeTab === 'displays' ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 shadow-inner' : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                    class="flex items-center space-x-3 px-4 py-3 rounded-xl border transition-all duration-300 font-medium">
                 <ng-icon name="heroComputerDesktop" class="text-lg"></ng-icon>
                 <span class="text-sm">Displays</span>
            </button>
            <button (click)="activeTab = 'audio'"
                    [class]="activeTab === 'audio' ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 shadow-inner' : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                    class="flex items-center space-x-3 px-4 py-3 rounded-xl border transition-all duration-300 font-medium">
                 <ng-icon name="heroSpeakerWave" class="text-lg"></ng-icon>
                 <span class="text-sm">Audio/MIDI</span>
            </button>
            <button (click)="activeTab = 'service-order'"
                    [class]="activeTab === 'service-order' ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 shadow-inner' : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                    class="flex items-center space-x-3 px-4 py-3 rounded-xl border transition-all duration-300 font-medium">
                 <ng-icon name="heroListBullet" class="text-lg"></ng-icon>
                 <span class="text-sm">Service Order</span>
            </button>
            <button (click)="activeTab = 'scheduler'"
                    [class]="activeTab === 'scheduler' ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 shadow-inner' : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'"
                    class="flex items-center space-x-3 px-4 py-3 rounded-xl border transition-all duration-300 font-medium">
                 <ng-icon name="heroCalendarDays" class="text-lg"></ng-icon>
                 <span class="text-sm">Scheduler</span>
            </button>
         </div>
         
         <div class="mt-auto p-4 space-y-3">
             @if (isDirty) {
                 <button (click)="save()" class="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg shadow-indigo-900/30 py-2.5 rounded-xl font-semibold flex items-center justify-center transition-all active:scale-95 duration-200 animate-in slide-in-from-bottom-2 fade-in">
                     <ng-icon name="heroCheck" class="mr-2 text-lg"></ng-icon> Save Changes
                 </button>
             }
             <button (click)="reset()" class="w-full bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700/50 text-slate-400 hover:text-slate-200 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-sm flex items-center justify-center">
                 <ng-icon name="heroArrowPath" class="mr-2"></ng-icon> Reset Defaults
             </button>
         </div>
         
         <div class="mt-2 px-6 pb-6 opacity-50 text-center">
             <p class="text-[10px] text-slate-500 font-medium">Config synced: {{ localSettings?.displayConfigs?.length || 0 }} displays</p>
             <p class="text-[9px] font-mono mt-1 text-slate-500 bg-slate-900/50 py-1 rounded">~/.harmonysync/app-settings.json</p>
         </div>
      </div>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col z-10 relative h-full">
         <div class="flex-1 overflow-y-auto custom-scrollbar p-10 pb-20 relative">
            @if (configService.isLoading()) {
                <div class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/50 backdrop-blur-sm z-50">
                    <div class="relative flex items-center justify-center mb-6">
                        <div class="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                        <ng-icon name="heroArrowPath" class="text-4xl text-indigo-400 animate-spin-slow relative z-10"></ng-icon>
                    </div>
                    <div class="text-sm font-medium text-slate-400 tracking-widest uppercase">Syncing Configuration...</div>
                </div>
            } @else if (localSettings) {
                
                <!-- GENERAL TAB -->
                @if (activeTab === 'general') {
                    <div class="w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <!-- Automated Flows -->
                        <section>
                            <div class="flex items-center space-x-3 mb-6">
                                <div class="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400 shadow-inner">
                                    <ng-icon name="heroArrowPath" class="text-lg"></ng-icon>
                                </div>
                                <h3 class="text-sm font-bold uppercase tracking-widest text-slate-200">Automated Flows</h3>
                            </div>
                            
                            <div class="grid grid-cols-1 gap-5 bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800/60 shadow-xl shadow-black/20">
                                <div class="flex flex-col space-y-2 pt-2">
                                    <label class="text-xs font-semibold text-slate-400 tracking-wide uppercase">Pre-Service Playlist URL</label>
                                    <div class="flex space-x-3">
                                        <input type="text" [(ngModel)]="localSettings.preservicePlaylistUrl" (ngModelChange)="markDirty()"
                                               placeholder="https://music.youtube.com/playlist?list=..."
                                               class="flex-1 w-full bg-slate-950/50 border border-slate-700/50 hover:border-indigo-500/50 text-slate-200 text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner placeholder-slate-600">
                                        <button (click)="openPreserviceBrowser()" class="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-5 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center whitespace-nowrap">
                                            Open in Browser
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>


                        <!-- Lyric Projection Foundation -->
                        <section>
                            <div class="flex items-center space-x-3 mb-6">
                                <div class="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20 text-purple-400 shadow-inner">
                                    <ng-icon name="heroComputerDesktop" class="text-lg"></ng-icon>
                                </div>
                                <h3 class="text-sm font-bold uppercase tracking-widest text-slate-200">Lyric Projection</h3>
                            </div>
                            
                            <div class="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800/60 shadow-xl shadow-black/20 space-y-8">
                                <!-- Monitor Frame Preview -->
                                <div class="relative group/preview">
                                    <div class="bg-slate-950 p-2 rounded-xl border border-slate-800 shadow-2xl relative overflow-hidden ring-1 ring-white/5">
                                        <div class="aspect-video bg-black rounded-lg relative overflow-hidden flex flex-col transition-all duration-500"
                                             [style.justify-content]="getVerticalAlign()"
                                             [style.align-items]="getHorizontalAlign()"
                                             [style.padding-top]="localSettings.lyrics.topOffset + '%'"
                                             [style.padding-bottom]="localSettings.lyrics.bottomOffset + '%'">
                                            
                                            <!-- Background Layer -->
                                            <div class="absolute inset-0 z-0 overflow-hidden">
                                                 @if (previewBgStyle === 'dark') {
                                                    <div class="absolute inset-0 bg-gradient-to-br from-[#0c0c1e] via-[#1a0c2e] to-black opacity-90 scale-110 blur-sm"></div>
                                                 } @else if (previewBgStyle === 'mesh') {
                                                    <div class="absolute inset-0 bg-[#001] opacity-90 mesh-gradient"></div>
                                                 } @else {
                                                     <div class="absolute inset-0 bg-zinc-950 overflow-hidden">
                                                        <div class="absolute -inset-[100%] animate-spin-slow bg-gradient-to-tr from-purple-500/20 to-transparent opacity-50 blur-2xl"></div>
                                                     </div>
                                                 }
                                            </div>
                                            
                                            <!-- Content Layer -->
                                            <div class="relative z-10 px-10 transition-all duration-300 w-full"
                                                 [style.font-family]="localSettings.lyrics.fontFamily"
                                                 [style.font-size]="(localSettings.lyrics.fontSize / 4) + 'px'"
                                                 [style.font-weight]="localSettings.lyrics.fontWeight"
                                                 [style.color]="localSettings.lyrics.color"
                                                 [style.text-shadow]="localSettings.lyrics.textShadow"
                                                 [style.text-align]="localSettings.lyrics.textAlign">
                                                <div>The Splendor of the King</div>
                                                <div class="opacity-80">Clothed in majesty</div>
                                            </div>
                                        </div>
                                        
                                        <!-- Overlay Controls -->
                                        <div class="absolute top-4 right-4 flex items-center opacity-0 group-hover/preview:opacity-100 transition-opacity duration-300">
                                            <button (click)="cycleBg()" class="bg-slate-900/80 hover:bg-slate-800 p-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white backdrop-blur-md shadow-lg transition-colors" title="Change Background">
                                                <ng-icon name="heroSwatch" class="text-sm"></ng-icon>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="mx-auto w-16 h-1.5 bg-slate-800 rounded-b-xl shadow-lg border-x border-b border-slate-700/50"></div>
                                </div>

                                <!-- Control Grid -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                    <div class="flex flex-col space-y-2 md:col-span-2">
                                        <label class="text-xs font-semibold text-slate-400 tracking-wide uppercase">Typography Foundation</label>
                                        <div class="relative">
                                            <select [(ngModel)]="localSettings.lyrics.fontFamily" (ngModelChange)="markDirty()"
                                                    class="w-full bg-slate-950/50 border border-slate-700/50 hover:border-purple-500/50 text-slate-200 text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all shadow-inner appearance-none cursor-pointer">
                                                <option value="Inter">Inter (Clean)</option>
                                                <option value="Roboto">Roboto (Modern)</option>
                                                <option value="Arial">Arial (System)</option>
                                                <option value="Montserrat">Montserrat (Display)</option>
                                                <option value="Open Sans">Open Sans (Geometric)</option>
                                            </select>
                                            <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="flex flex-col space-y-2">
                                        <label class="text-xs font-semibold text-slate-400 tracking-wide uppercase">Font Size (px)</label>
                                        <input type="number" [(ngModel)]="localSettings.lyrics.fontSize" (ngModelChange)="markDirty()"
                                               class="bg-slate-950/50 border border-slate-700/50 hover:border-purple-500/50 text-slate-200 text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all shadow-inner">
                                    </div>
                                    <div class="flex flex-col space-y-2">
                                        <label class="text-xs font-semibold text-slate-400 tracking-wide uppercase">Weight</label>
                                        <div class="relative">
                                            <select [(ngModel)]="localSettings.lyrics.fontWeight" (ngModelChange)="markDirty()"
                                                    class="w-full bg-slate-950/50 border border-slate-700/50 hover:border-purple-500/50 text-slate-200 text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all shadow-inner appearance-none cursor-pointer">
                                                <option value="normal">Normal</option>
                                                <option value="medium">Medium</option>
                                                <option value="bold">Bold</option>
                                                <option value="black">Black</option>
                                            </select>
                                            <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="flex flex-col space-y-2">
                                        <label class="text-xs font-semibold text-slate-400 tracking-wide uppercase">Horizontal Align</label>
                                        <div class="bg-slate-950/50 p-1 rounded-xl flex border border-slate-700/50 shadow-inner">
                                            <button (click)="setAlignHorizontal('left')" [class]="localSettings.lyrics.textAlign === 'left' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'" class="flex-1 text-xs py-2 rounded-lg font-medium transition-all">Left</button>
                                            <button (click)="setAlignHorizontal('center')" [class]="localSettings.lyrics.textAlign === 'center' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'" class="flex-1 text-xs py-2 rounded-lg font-medium transition-all mx-1">Center</button>
                                            <button (click)="setAlignHorizontal('right')" [class]="localSettings.lyrics.textAlign === 'right' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'" class="flex-1 text-xs py-2 rounded-lg font-medium transition-all">Right</button>
                                        </div>
                                    </div>
                                    <div class="flex flex-col space-y-2">
                                        <label class="text-xs font-semibold text-slate-400 tracking-wide uppercase">Vertical Anchor</label>
                                        <div class="bg-slate-950/50 p-1 rounded-xl flex border border-slate-700/50 shadow-inner">
                                            <button (click)="setAlignVertical('top')" [class]="localSettings.lyrics.verticalAlignment === 'top' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'" class="flex-1 text-xs py-2 rounded-lg font-medium transition-all">Top</button>
                                            <button (click)="setAlignVertical('middle')" [class]="localSettings.lyrics.verticalAlignment === 'middle' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'" class="flex-1 text-xs py-2 rounded-lg font-medium transition-all mx-1">Middle</button>
                                            <button (click)="setAlignVertical('bottom')" [class]="localSettings.lyrics.verticalAlignment === 'bottom' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'" class="flex-1 text-xs py-2 rounded-lg font-medium transition-all">Bottom</button>
                                        </div>
                                    </div>

                                    <div class="flex flex-col space-y-2">
                                        <div class="flex justify-between items-center">
                                            <label class="text-xs font-semibold text-slate-400 tracking-wide uppercase">Base Margin (%)</label>
                                            <span class="text-xs text-purple-400 font-mono bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">{{ localSettings.lyrics.bottomOffset }}%</span>
                                        </div>
                                        <input type="range" [(ngModel)]="localSettings.lyrics.bottomOffset" (ngModelChange)="markDirty()"
                                               min="0" max="100" class="accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer mt-3">
                                    </div>
                                    <div class="flex flex-col space-y-2">
                                        <div class="flex justify-between items-center">
                                            <label class="text-xs font-semibold text-slate-400 tracking-wide uppercase">Top Padding (%)</label>
                                            <span class="text-xs text-purple-400 font-mono bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">{{ localSettings.lyrics.topOffset }}%</span>
                                        </div>
                                        <input type="range" [(ngModel)]="localSettings.lyrics.topOffset" (ngModelChange)="markDirty()"
                                               min="0" max="100" class="accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer mt-3">
                                    </div>
                                </div>

                                <div class="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20 flex items-start space-x-4 shadow-inner">
                                    <div class="p-1.5 bg-purple-500/20 rounded-md shrink-0 text-purple-400">
                                        <ng-icon name="heroAdjustmentsHorizontal" class="text-lg"></ng-icon>
                                    </div>
                                    <p class="text-sm text-purple-200/80 font-medium leading-relaxed pt-0.5">
                                        Tip: Anchoring at <span class="text-purple-300 font-semibold">Bottom</span> with a high <span class="text-purple-300 font-semibold">Base Margin</span> is ideal for band-clearance on video walls.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
                }

                <!-- DISPLAYS TAB -->
                @if (activeTab === 'displays') {
                    <div class="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center space-x-3">
                                <div class="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400 shadow-inner">
                                    <ng-icon name="heroComputerDesktop" class="text-lg"></ng-icon>
                                </div>
                                <h3 class="text-sm font-bold uppercase tracking-widest text-slate-200">Display Nodes</h3>
                            </div>
                            <button (click)="addDisplay()" 
                                    class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all active:scale-95 shadow-lg shadow-emerald-900/20 flex items-center">
                                <ng-icon name="heroPlus" class="mr-1.5"></ng-icon> Add Node
                            </button>
                        </div>

                        <div class="space-y-4">
                            @for (config of localSettings.displayConfigs; track config.id; let i = $index) {
                                <div class="bg-slate-900/40 backdrop-blur-md p-5 rounded-2xl border border-slate-800/60 hover:border-slate-700/80 transition-all duration-300 shadow-xl shadow-black/10 group">
                                    <div class="flex items-start justify-between">
                                        <div class="space-y-5 flex-1">
                                            <div class="flex flex-wrap items-center gap-3">
                                                <div class="relative flex-1 min-w-[200px]">
                                                    <input [(ngModel)]="config.name" (ngModelChange)="markDirty()"
                                                           placeholder="Display Name"
                                                           class="bg-transparent border-b-2 border-slate-700 focus:border-emerald-500 text-slate-100 text-base font-bold px-1 py-1 w-full focus:outline-none transition-colors placeholder-slate-600">
                                                </div>
                                                <div class="relative w-40">
                                                    <select [(ngModel)]="config.type" (ngModelChange)="markDirty()"
                                                            class="w-full bg-slate-800 border border-slate-700 text-emerald-300 text-xs font-medium px-3 py-1.5 rounded-lg outline-none focus:border-emerald-500 appearance-none cursor-pointer">
                                                        <option value="audience">Audience</option>
                                                        <option value="confidence">Confidence</option>
                                                        <option value="lyrics">Lyrics</option>
                                                        <option value="lower-thirds">Lower Thirds</option>
                                                        <option value="custom">Custom</option>
                                                    </select>
                                                    <div class="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-500">
                                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div class="space-y-2">
                                                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Physical Output</label>
                                                    <div class="relative">
                                                        <select [(ngModel)]="config.deviceId" (ngModelChange)="markDirty()"
                                                                class="w-full bg-slate-950/50 border border-slate-700/50 hover:border-emerald-500/50 text-slate-200 text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-inner appearance-none cursor-pointer">
                                                            <option value="">Auto (Default)</option>
                                                            @for (device of availableDisplays; track device.id) {
                                                                <option [value]="device.id">{{ device.name }}</option>
                                                            }
                                                        </select>
                                                        <div class="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
                                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="space-y-2">
                                                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">NDI Source (Optional)</label>
                                                    <input type="text" [(ngModel)]="config.ndiOutput" (ngModelChange)="markDirty()"
                                                           placeholder="HarmonySync-NDI"
                                                           class="w-full bg-slate-950/50 border border-slate-700/50 hover:border-emerald-500/50 text-slate-200 text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-inner placeholder-slate-600">
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="flex flex-col items-end space-y-4 ml-6 pl-4 border-l border-slate-800">
                                            <div class="flex flex-col items-center space-y-1">
                                                <label class="text-[9px] font-bold text-slate-500 uppercase">Status</label>
                                                <label class="relative inline-flex items-center cursor-pointer mt-1">
                                                    <input type="checkbox" [(ngModel)]="config.enabled" (ngModelChange)="markDirty()" class="sr-only peer">
                                                    <div class="w-10 h-5.5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                                                </label>
                                            </div>
                                            <button (click)="removeDisplay(i)" 
                                                    class="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-2 rounded-lg transition-all mt-2" title="Remove Node">
                                                <ng-icon name="heroTrash" class="text-lg"></ng-icon>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            }
                            @if (localSettings.displayConfigs.length === 0) {
                                <div class="text-center py-10 border-2 border-dashed border-slate-800 rounded-2xl">
                                    <ng-icon name="heroComputerDesktop" class="text-4xl text-slate-700 mb-2"></ng-icon>
                                    <p class="text-sm text-slate-500">No display nodes configured.</p>
                                </div>
                            }
                        </div>
                    </div>
                }

                <!-- AUDIO TAB -->
                @if (activeTab === 'audio') {
                    <div class="w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <section>
                            <div class="flex items-center space-x-3 mb-6">
                                <div class="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-400 shadow-inner">
                                    <ng-icon name="heroSpeakerWave" class="text-lg"></ng-icon>
                                </div>
                                <h3 class="text-sm font-bold uppercase tracking-widest text-slate-200">Audio Pipeline</h3>
                            </div>

                            <div class="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800/60 shadow-xl shadow-black/20">
                                <div class="flex flex-col space-y-2">
                                    <label class="text-xs font-semibold text-slate-400 tracking-wide uppercase">Main Output Device</label>
                                    <div class="relative">
                                        <select [(ngModel)]="localSettings.audio.audioOutputDevice" (ngModelChange)="markDirty()"
                                                class="w-full bg-slate-950/50 border border-slate-700/50 hover:border-amber-500/50 text-slate-200 text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all shadow-inner appearance-none cursor-pointer">
                                            <option value="">System Default</option>
                                            @for (device of availableAudioDevices; track device.id) {
                                                <option [value]="device.id">{{ device.name }}</option>
                                            }
                                        </select>
                                        <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <div class="flex items-center space-x-3 mb-6">
                                <div class="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20 text-rose-400 shadow-inner">
                                    <ng-icon name="heroMusicalNote" class="text-lg"></ng-icon>
                                </div>
                                <h3 class="text-sm font-bold uppercase tracking-widest text-slate-200">MIDI Integration</h3>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800/60 shadow-xl shadow-black/20 space-y-4">
                                    <div class="flex items-center space-x-3 border-b border-slate-800 pb-3">
                                        <div class="p-1.5 bg-sky-500/10 rounded-md text-sky-400">
                                            <ng-icon name="heroMicrophone" class="text-base"></ng-icon>
                                        </div>
                                        <label class="text-xs font-bold text-slate-300 uppercase tracking-wide">MIDI Input</label>
                                    </div>
                                    <div class="relative pt-2">
                                        <select [(ngModel)]="localSettings.audio.midiInputDevice" (ngModelChange)="markDirty()"
                                                class="w-full bg-slate-950/50 border border-slate-700/50 hover:border-sky-500/50 text-slate-200 text-sm px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 appearance-none transition-all shadow-inner cursor-pointer">
                                            <option value="">None</option>
                                            @for (device of availableMidiInputDevices; track device.id) {
                                                <option [value]="device.id">{{ device.name }}</option>
                                            }
                                        </select>
                                        <div class="absolute inset-y-0 mt-2 right-4 flex items-center pointer-events-none text-slate-500">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>

                                <div class="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800/60 shadow-xl shadow-black/20 space-y-4">
                                    <div class="flex items-center space-x-3 border-b border-slate-800 pb-3">
                                        <div class="p-1.5 bg-rose-500/10 rounded-md text-rose-400">
                                            <ng-icon name="heroSpeakerWave" class="text-base"></ng-icon>
                                        </div>
                                        <label class="text-xs font-bold text-slate-300 uppercase tracking-wide">MIDI Output</label>
                                    </div>
                                    <div class="relative pt-2">
                                        <select [(ngModel)]="localSettings.audio.midiOutputDevice" (ngModelChange)="markDirty()"
                                                class="w-full bg-slate-950/50 border border-slate-700/50 hover:border-rose-500/50 text-slate-200 text-sm px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 appearance-none transition-all shadow-inner cursor-pointer">
                                            <option value="">None</option>
                                            @for (device of availableMidiOutputDevices; track device.id) {
                                                <option [value]="device.id">{{ device.name }}</option>
                                            }
                                        </select>
                                        <div class="absolute inset-y-0 mt-2 right-4 flex items-center pointer-events-none text-slate-500">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                }

                <!-- SERVICE ORDER TAB -->
                @if (activeTab === 'service-order') {
                    <div class="w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <section>
                            <div class="flex items-center space-x-3 mb-6">
                                <div class="p-2 bg-pink-500/10 rounded-lg border border-pink-500/20 text-pink-400 shadow-inner">
                                    <ng-icon name="heroListBullet" class="text-lg"></ng-icon>
                                </div>
                                <h3 class="text-sm font-bold uppercase tracking-widest text-slate-200">Batch Service Ingestion</h3>
                            </div>

                            <div class="bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800/60 shadow-xl shadow-black/20 space-y-8">
                                <div class="flex flex-col space-y-2">
                                    <label class="text-xs font-semibold text-slate-400 tracking-wide uppercase">Service Order Folder</label>
                                    <p class="text-[10px] text-slate-500 mb-2">Select a parent folder. The system will automatically iterate over all subfolders. It will skip Canva slides and auto-run the Python automation on any subfolder containing song materials.</p>
                                    <div class="flex space-x-3">
                                        <input type="text" [(ngModel)]="localSettings.serviceOrder.watchFolder" (ngModelChange)="markDirty()"
                                               placeholder="/path/to/service/order/folder"
                                               class="flex-1 bg-slate-950/50 border border-slate-700/50 hover:border-pink-500/50 text-slate-200 text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 transition-all shadow-inner placeholder-slate-600">
                                        <button (click)="browseWatchFolder()" class="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-xl border border-slate-700 hover:border-slate-600 text-sm font-bold text-slate-200 transition-colors shadow-sm whitespace-nowrap">Browse</button>
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-800">
                                    <div class="flex items-center justify-between p-4 bg-slate-950/30 rounded-xl border border-slate-800/50 mt-4 md:col-span-2">
                                        <div class="flex flex-col">
                                            <span class="text-sm font-medium text-slate-200">Run Batch Ingestion</span>
                                            <span class="text-xs text-slate-500">Scan all subfolders and generate song-map.json files</span>
                                        </div>
                                        <div class="flex items-center space-x-6">
                                            <button (click)="processSongFolder()" [disabled]="isProcessingSongMap() || !localSettings.serviceOrder.watchFolder"
                                                    class="bg-emerald-600/20 hover:bg-emerald-600/40 disabled:opacity-50 text-emerald-300 border border-emerald-500/30 px-5 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center shadow-sm whitespace-nowrap">
                                                @if (isProcessingSongMap()) {
                                                    <ng-icon name="heroArrowPath" class="mr-2 animate-spin-slow"></ng-icon> Processing...
                                                } @else {
                                                    <ng-icon name="heroComputerDesktop" class="mr-2"></ng-icon> Ingest Folder
                                                }
                                            </button>
                                        </div>
                                    </div>
                                    @if (isProcessingSongMap() && progressPercent() > 0) {
                                        <div class="md:col-span-2 px-4 pb-4">
                                            <div class="flex justify-between items-center mb-1">
                                                <span class="text-xs font-medium text-emerald-400">{{ progressMessage() }}</span>
                                                <span class="text-xs font-mono text-emerald-500">{{ progressPercent() }}%</span>
                                            </div>
                                            <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                <div class="bg-emerald-500 h-1.5 rounded-full transition-all duration-500 ease-out" [style.width.%]="progressPercent()"></div>
                                            </div>
                                        </div>
                                    }


                                    <div class="flex items-center justify-between p-4 bg-slate-950/30 rounded-xl border border-slate-800/50 mt-4">
                                        <div class="flex flex-col">
                                            <span class="text-sm font-medium text-slate-200">Auto-import on startup</span>
                                            <span class="text-xs text-slate-500">Scan for new files automatically</span>
                                        </div>
                                        <label class="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" [(ngModel)]="localSettings.serviceOrder.autoImportOnStartup" (ngModelChange)="markDirty()" class="sr-only peer">
                                            <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500 shadow-inner"></div>
                                        </label>
                                    </div>

                                    <div class="flex items-center justify-between p-4 bg-slate-950/30 rounded-xl border border-slate-800/50 mt-4">
                                        <div class="flex flex-col">
                                            <span class="text-sm font-medium text-slate-200">Advance on Video End</span>
                                            <span class="text-xs text-slate-500">Automatically progress to next item</span>
                                        </div>
                                        <label class="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" [(ngModel)]="localSettings.serviceOrder.advanceOnVideoEnd" (ngModelChange)="markDirty()" class="sr-only peer">
                                            <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500 shadow-inner"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                }

                <!-- SCHEDULER TAB -->
                @if (activeTab === 'scheduler') {
                    <div class="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <app-scheduler [localSettings]="localSettings" (markDirty)="markDirty()" class="block w-full h-full"></app-scheduler>
                    </div>
                }
            }
         </div>
      </div>
    </div>
  `,
    styles: [`
    :host {
      display: block;
      height: 100%;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.2);
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(148, 163, 184, 0.4);
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    select option {
      background: #0f172a;
      color: #cbd5e1;
    }
    .mesh-gradient {
        background-color: #020617;
        background-image: 
            radial-gradient(at 0% 0%, hsla(253,16%,15%,1) 0, transparent 50%), 
            radial-gradient(at 50% 0%, hsla(225,39%,25%,1) 0, transparent 50%), 
            radial-gradient(at 100% 0%, hsla(339,49%,20%,1) 0, transparent 50%);
    }
    .animate-spin-slow {
        animation: spin 8s linear infinite;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        background: #a855f7;
        cursor: pointer;
        border-radius: 50%;
        border: 2px solid #0f172a;
        box-shadow: 0 0 12px rgba(168, 85, 247, 0.6);
        transition: all 0.2s ease;
    }
    input[type="range"]::-webkit-slider-thumb:hover {
        background: #c084fc;
        transform: scale(1.15);
    }
    .h-5\\.5 {
        height: 1.375rem;
    }
    .h-4\\.5 {
        height: 1.125rem;
    }
    .w-4\\.5 {
        width: 1.125rem;
    }
  `],
    providers: [
        provideIcons({
            heroPlus,
            heroTrash,
            heroCheck,
            heroArrowPath,
            heroEye,
            heroSwatch,
            heroAdjustmentsHorizontal,
            heroListBullet,
            heroComputerDesktop,
            heroArrowsPointingOut,
            heroSpeakerWave,
            heroMusicalNote,
            heroMicrophone,
            heroXMark,
            heroCalendarDays
        })
    ]
})
export class SettingsComponent implements OnInit {
    readonly configService = inject(ConfigService);
    readonly electronService = inject(ElectronService);
    private dialogRef = inject(DialogRef, { optional: true });

    @Output() closeSettings = new EventEmitter<void>();

    isProcessingSongMap = signal<boolean>(false);
    progressMessage = signal<string>('');
    progressPercent = signal<number>(0);

    activeTab: 'general' | 'displays' | 'audio' | 'service-order' | 'scheduler' = 'general';
    localSettings: AppSettings | null = null;
    isDirty = false;
    previewBgStyle: 'dark' | 'mesh' | 'animated' = 'dark';

    // Device discovery state
    availableDisplays: any[] = [];
    availableAudioDevices: any[] = [];
    availableMidiInputDevices: any[] = [];
    availableMidiOutputDevices: any[] = [];

    close() {
        if (this.dialogRef) {
            this.dialogRef.close();
        } else {
            this.closeSettings.emit();
        }
    }

    async processSongFolder() {
        if (this.isProcessingSongMap()) return;
        
        try {
            this.isProcessingSongMap.set(true);
            const folderToProcess = this.localSettings?.serviceOrder?.watchFolder;
            if (!folderToProcess) {
                alert('Please select a Service Order folder first.');
                return;
            }
            
            const result = await this.electronService.invoke('python:processSongFolder', folderToProcess, false);
            
            if (result.success) {
                console.log('Successfully processed song folder:', result.output);
                alert(`Successfully ingested service folder!\n\n${result.output}`);
            } else {
                console.error('Failed to process song folder:', result.error);
                alert('Error processing song folder: ' + result.error);
            }
        } catch (error) {
            console.error('Error invoking python processor:', error);
            alert('An unexpected error occurred: ' + String(error));
        } finally {
            this.isProcessingSongMap.set(false);
            this.progressMessage.set('');
            this.progressPercent.set(0);
        }
    }

    ngOnInit() {
        // Deep clone to avoid direct editing of signal
        const settings = this.configService.settings();
        if (settings) {
            this.localSettings = JSON.parse(JSON.stringify(settings));
            // Ensure displayConfigs and audio exist
            if (!this.localSettings?.displayConfigs) (this.localSettings as any).displayConfigs = [];
            if (!this.localSettings?.audio) (this.localSettings as any).audio = { audioOutputDevice: '', midiInputDevice: '', midiOutputDevice: '' };
            if (!this.localSettings?.serviceOrder) (this.localSettings as any).serviceOrder = { watchFolder: '', autoImportOnStartup: false };
        }

        this.loadDevices();

        if (this.electronService.isElectron) {
            this.electronService.on('python:process-progress', (event: any) => {
                this.progressMessage.set(event.message || '');
                this.progressPercent.set(event.percent || 0);
            });
        }
    }

    private async loadDevices() {
        if (!this.electronService.isElectron) return;

        try {
            const displays = await this.electronService.invoke('settings:getDisplays');
            this.availableDisplays = Array.isArray(displays) ? displays : [];

            const audioDevices = await this.electronService.invoke('settings:getAudioDevices');
            this.availableAudioDevices = Array.isArray(audioDevices) ? audioDevices : [];

            // MIDI devices (placeholder logic as seen in React)
            this.availableMidiInputDevices = [];
            this.availableMidiOutputDevices = [];
        } catch (error) {
            console.error('Failed to load devices:', error);
        }
    }

    markDirty() {
        this.isDirty = true;
    }



    addDisplay() {
        if (!this.localSettings) return;
        if (!this.localSettings.displayConfigs) this.localSettings.displayConfigs = [];
        this.localSettings.displayConfigs.push({
            id: `display_${Date.now()}`,
            name: 'Secondary Screen',
            type: 'audience',
            enabled: true
        });
        this.markDirty();
    }

    removeDisplay(index: number) {
        if (!this.localSettings) return;
        this.localSettings.displayConfigs.splice(index, 1);
        this.markDirty();
    }

    save() {
        if (!this.localSettings) return;
        this.configService.saveSettings(this.localSettings).subscribe(success => {
            if (success) {
                this.isDirty = false;
            }
        });
    }

    reset() {
        this.configService.loadSettings().subscribe(settings => {
            if (settings) {
                this.localSettings = JSON.parse(JSON.stringify(settings));
                this.isDirty = false;
            }
        });
    }

    getVerticalAlign(): string {
        const v = this.localSettings?.lyrics.verticalAlignment;
        return v === 'top' ? 'flex-start' : (v === 'middle' ? 'center' : 'flex-end');
    }

    getHorizontalAlign(): string {
        const h = this.localSettings?.lyrics.textAlign;
        return h === 'left' ? 'flex-start' : (h === 'center' ? 'center' : 'flex-end');
    }

    // UX Helpers
    cycleBg() {
        const styles: ('dark' | 'mesh' | 'animated')[] = ['dark', 'mesh', 'animated'];
        const nextIdx = (styles.indexOf(this.previewBgStyle) + 1) % styles.length;
        this.previewBgStyle = styles[nextIdx];
    }

    setAlignHorizontal(val: 'left' | 'center' | 'right') {
        if (this.localSettings) {
            this.localSettings.lyrics.textAlign = val;
            this.markDirty();
        }
    }

    setAlignVertical(val: 'top' | 'middle' | 'bottom') {
        if (this.localSettings) {
            this.localSettings.lyrics.verticalAlignment = val;
            this.markDirty();
        }
    }
    async browseWatchFolder() {
        if (!this.electronService.isElectron) return;
        try {
            const result = await this.electronService.invoke('dialog:openDirectory');
            if (result && result.length > 0) {
                this.localSettings!.serviceOrder.watchFolder = result[0];
                this.markDirty();
            }
        } catch (error) {
            console.error('Failed to browse folder:', error);
        }
    }

    openPreserviceBrowser() {
        if (this.localSettings?.preservicePlaylistUrl) {
            this.electronService.send('open-url-external', this.localSettings.preservicePlaylistUrl);
        }
    }
}
