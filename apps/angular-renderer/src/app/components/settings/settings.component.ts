
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    heroMicrophone
} from '@ng-icons/heroicons/outline';
import { ElectronService } from '../../core/electron.service';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, FormsModule, NgIconComponent],
    template: `
    <div class="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] select-none font-sans overflow-hidden">
      <!-- Header -->
      <div class="p-4 bg-[#252526] border-b border-[#3c3c3c] flex items-center justify-between shadow-sm z-20">
        <div class="flex items-center space-x-2">
            <ng-icon name="heroAdjustmentsHorizontal" class="text-[#007acc] text-lg"></ng-icon>
            <h2 class="text-xs font-bold uppercase tracking-wider text-[#e1e1e1]">Settings</h2>
        </div>
        <div class="flex items-center space-x-2">
            @if (isDirty) {
                <button (click)="save()" 
                        class="bg-[#007acc] hover:bg-[#005a9e] text-white text-[10px] font-semibold px-3 py-1.5 rounded-sm flex items-center transition-all shadow-sm active:scale-95">
                    <ng-icon name="heroCheck" class="mr-1.5"></ng-icon> Save Changes
                </button>
            }
            <button (click)="reset()" 
                    class="hover:bg-[#37373d] p-1.5 rounded transition-all text-[#858585] hover:text-[#cccccc]"
                    title="Reset to defaults">
                <ng-icon name="heroArrowPath" class="text-sm"></ng-icon>
            </button>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="bg-[#252526] border-b border-[#3c3c3c] flex px-4 z-10">
        <button (click)="activeTab = 'general'" 
                [class.border-[#007acc]]="activeTab === 'general'"
                [class.text-white]="activeTab === 'general'"
                class="px-4 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 border-transparent hover:text-white transition-all">General</button>
        <button (click)="activeTab = 'displays'" 
                [class.border-[#007acc]]="activeTab === 'displays'"
                [class.text-white]="activeTab === 'displays'"
                class="px-4 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 border-transparent hover:text-white transition-all ml-4">Displays</button>
        <button (click)="activeTab = 'audio'" 
                [class.border-[#007acc]]="activeTab === 'audio'"
                [class.text-white]="activeTab === 'audio'"
                class="px-4 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 border-transparent hover:text-white transition-all ml-4">Audio/MIDI</button>
        <button (click)="activeTab = 'service-order'" 
                [class.border-[#007acc]]="activeTab === 'service-order'"
                [class.text-white]="activeTab === 'service-order'"
                class="px-4 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 border-transparent hover:text-white transition-all ml-4">Service Order</button>
      </div>

      <!-- Settings Content -->
      <div class="flex-1 overflow-auto custom-scrollbar p-6">
        @if (configService.isLoading()) {
            <div class="flex flex-col items-center justify-center py-20 animate-pulse">
                <ng-icon name="heroArrowPath" class="text-3xl text-[#3c3c3c] animate-spin-slow mb-4"></ng-icon>
                <div class="text-xs text-[#858585]">Syncing with backend...</div>
            </div>
        } @else if (localSettings) {
            
            <!-- GENERAL TAB -->
            @if (activeTab === 'general') {
                <div class="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                    <!-- Automated Flows -->
                    <section>
                        <div class="flex items-center space-x-2 mb-4">
                            <ng-icon name="heroArrowPath" class="text-[#858585] text-xs"></ng-icon>
                            <h3 class="text-[10px] font-bold uppercase tracking-widest text-[#858585]">Automated Flows</h3>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#252526] p-4 rounded-md border border-[#333333]">
                            <div class="flex flex-col space-y-1.5">
                                <label class="text-[10px] font-medium text-[#969696]">Pre-Service Playlist Start</label>
                                <input type="time" [(ngModel)]="localSettings.preServicePlaylistStartTime" (ngModelChange)="markDirty()"
                                       class="w-full bg-[#3c3c3c] border border-[#454545] hover:border-[#555555] text-[#e1e1e1] text-xs px-3 py-2 rounded focus:outline-none focus:border-[#007acc] transition-all">
                            </div>

                            <div class="flex flex-col space-y-1.5">
                                <label class="text-[10px] font-medium text-[#969696]">Countdown Video Start</label>
                                <input type="time" [(ngModel)]="localSettings.countdownVideoStartTime" (ngModelChange)="markDirty()"
                                       class="w-full bg-[#3c3c3c] border border-[#454545] hover:border-[#555555] text-[#e1e1e1] text-xs px-3 py-2 rounded focus:outline-none focus:border-[#007acc] transition-all">
                            </div>

                            <div class="flex flex-col space-y-1.5 md:col-span-2">
                                <label class="text-[10px] font-medium text-[#969696]">Pre-Service Playlist URL (YouTube/Music)</label>
                                <input type="text" [(ngModel)]="localSettings.preservicePlaylistUrl" (ngModelChange)="markDirty()"
                                       placeholder="https://music.youtube.com/playlist?list=..."
                                       class="w-full bg-[#3c3c3c] border border-[#454545] hover:border-[#555555] text-[#e1e1e1] text-xs px-3 py-2 rounded focus:outline-none focus:border-[#007acc] transition-all">
                            </div>
                        </div>
                    </section>

                    <!-- Service List -->
                    <section>
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center space-x-2">
                                <ng-icon name="heroListBullet" class="text-[#858585] text-xs"></ng-icon>
                                <h3 class="text-[10px] font-bold uppercase tracking-widest text-[#858585]">Service Schedule</h3>
                            </div>
                            <button (click)="addService()" 
                                    class="text-[#007acc] hover:text-[#4ea6ff] text-[10px] font-bold flex items-center transition-colors group">
                                <ng-icon name="heroPlus" class="mr-1 group-hover:scale-125 transition-transform"></ng-icon>Add Time
                            </button>
                        </div>

                        <div class="space-y-3">
                            @for (service of localSettings.serviceTimes; track service.id; let i = $index) {
                                <div class="bg-[#252526] p-4 rounded-md border border-[#333333] hover:border-[#454545] relative transition-all group/card shadow-sm">
                                    <button (click)="removeService(i)" 
                                            class="absolute -top-2 -right-2 bg-[#333333] text-[#858585] hover:text-red-400 hover:bg-[#3c3c3c] p-1.5 rounded-full opacity-0 group-hover/card:opacity-100 transition-all shadow-md z-10 border border-[#444444]">
                                        <ng-icon name="heroTrash" class="text-xs"></ng-icon>
                                    </button>
                                    
                                    <div class="space-y-4">
                                        <div class="relative">
                                            <input [(ngModel)]="service.name" (ngModelChange)="markDirty()"
                                                   placeholder="Service Type (e.g. Traditional)"
                                                   class="bg-transparent border-none text-[#e1e1e1] text-[13px] font-bold p-0 w-full focus:ring-0 placeholder-[#4d4d4d]">
                                            <div class="h-0.5 w-8 bg-[#007acc] rounded-full mt-1"></div>
                                        </div>
                                        
                                        <div class="grid grid-cols-2 gap-4">
                                            <div class="space-y-1.5">
                                                <label class="text-[9px] font-bold text-[#858585] uppercase tracking-tighter">Start Window</label>
                                                <input type="time" [(ngModel)]="service.startTime" (ngModelChange)="markDirty()"
                                                       class="bg-[#3c3c3c] border border-[#444444] text-[#e1e1e1] text-[11px] px-2 py-1.5 rounded w-full focus:border-[#007acc] outline-none transition-all">
                                            </div>
                                            <div class="space-y-1.5">
                                                <label class="text-[9px] font-bold text-[#858585] uppercase tracking-tighter">End Window</label>
                                                <input type="time" [(ngModel)]="service.endTime" (ngModelChange)="markDirty()"
                                                       class="bg-[#3c3c3c] border border-[#444444] text-[#e1e1e1] text-[11px] px-2 py-1.5 rounded w-full focus:border-[#007acc] outline-none transition-all">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            }
                        </div>
                    </section>

                    <!-- Lyric Projection Foundation -->
                    <section>
                        <div class="flex items-center space-x-2 mb-4">
                            <ng-icon name="heroComputerDesktop" class="text-[#858585] text-xs"></ng-icon>
                            <h3 class="text-[10px] font-bold uppercase tracking-widest text-[#858585]">Lyric Projection</h3>
                        </div>
                        
                        <div class="bg-[#252526] p-4 rounded-md border border-[#333333] space-y-6">
                            <!-- Monitor Frame Preview -->
                            <div class="relative group/preview shadow-2xl">
                                <div class="bg-[#111111] p-1.5 rounded-lg border border-[#444444] shadow-inner relative overflow-hidden">
                                    <div class="aspect-video bg-black rounded relative overflow-hidden flex flex-col transition-all duration-500"
                                         [style.justify-content]="getVerticalAlign()"
                                         [style.align-items]="getHorizontalAlign()"
                                         [style.padding-top]="localSettings.lyrics.topOffset + '%'"
                                         [style.padding-bottom]="localSettings.lyrics.bottomOffset + '%'">
                                        
                                        <!-- Background Layer -->
                                        <div class="absolute inset-0 z-0 overflow-hidden">
                                             @if (previewBgStyle === 'dark') {
                                                <div class="absolute inset-0 bg-gradient-to-br from-[#0c0c1e] via-[#1a0c2e] to-black opacity-80 scale-110 blur-sm"></div>
                                             } @else if (previewBgStyle === 'mesh') {
                                                <div class="absolute inset-0 bg-[#001] opacity-90 mesh-gradient"></div>
                                             } @else {
                                                 <div class="absolute inset-0 bg-zinc-900 overflow-hidden">
                                                    <div class="absolute -inset-[100%] animate-spin-slow bg-gradient-to-tr from-[#0044cc22] to-transparent opacity-40"></div>
                                                 </div>
                                             }
                                        </div>
                                        
                                        <!-- Content Layer -->
                                        <div class="relative z-10 px-8 transition-all duration-300"
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
                                    <div class="absolute top-3 right-3 flex items-center space-x-1.5 opacity-0 group-hover/preview:opacity-100 transition-all duration-300">
                                        <button (click)="cycleBg()" class="bg-[#252526]/80 hover:bg-[#2d2d30] p-1.5 rounded-sm border border-[#444444] text-[#aaa] hover:text-white backdrop-blur-sm" title="Change Background">
                                            <ng-icon name="heroSwatch" class="text-xs"></ng-icon>
                                        </button>
                                    </div>
                                </div>
                                <div class="mx-auto w-12 h-1 bg-[#1a1a1a] rounded-b-full shadow-lg"></div>
                            </div>

                            <!-- Control Grid -->
                            <div class="space-y-4 pt-2">
                                <div class="flex flex-col space-y-1.5">
                                    <label class="text-[10px] font-bold text-[#858585] uppercase tracking-widest">Typography Foundation</label>
                                    <select [(ngModel)]="localSettings.lyrics.fontFamily" (ngModelChange)="markDirty()"
                                            class="w-full bg-[#3c3c3c] border border-[#444444] text-[#e1e1e1] text-xs px-3 py-2 rounded focus:outline-none focus:border-[#007acc] transition-all">
                                        <option value="Inter">Inter (Clean)</option>
                                        <option value="Roboto">Roboto (Modern)</option>
                                        <option value="Arial">Arial (System)</option>
                                        <option value="Montserrat">Montserrat (Display)</option>
                                        <option value="Open Sans">Open Sans (Geometric)</option>
                                    </select>
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                    <div class="flex flex-col space-y-1.5">
                                        <label class="text-[10px] font-medium text-[#969696]">Font Size (px)</label>
                                        <input type="number" [(ngModel)]="localSettings.lyrics.fontSize" (ngModelChange)="markDirty()"
                                               class="bg-[#3c3c3c] border border-[#444444] text-[#e1e1e1] text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-[#007acc] transition-all">
                                    </div>
                                    <div class="flex flex-col space-y-1.5">
                                        <label class="text-[10px] font-medium text-[#969696]">Weight</label>
                                        <select [(ngModel)]="localSettings.lyrics.fontWeight" (ngModelChange)="markDirty()"
                                                class="bg-[#3c3c3c] border border-[#444444] text-[#e1e1e1] text-xs px-2.5 py-1.5 rounded outline-none focus:border-[#007acc]">
                                            <option value="normal">Normal</option>
                                            <option value="medium">Medium</option>
                                            <option value="bold">Bold</option>
                                            <option value="black">Black</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4 pt-2">
                                    <div class="flex flex-col space-y-1.5">
                                        <label class="text-[10px] font-medium text-[#969696]">Horizontal Align</label>
                                        <div class="bg-[#3c3c3c] p-0.5 rounded flex border border-[#444444]">
                                            <button (click)="setAlignHorizontal('left')" [class.bg-[#5a5a5a]]="localSettings.lyrics.textAlign === 'left'" class="flex-1 text-[10px] py-1 rounded-sm">L</button>
                                            <button (click)="setAlignHorizontal('center')" [class.bg-[#5a5a5a]]="localSettings.lyrics.textAlign === 'center'" class="flex-1 text-[10px] py-1 rounded-sm mx-0.5">C</button>
                                            <button (click)="setAlignHorizontal('right')" [class.bg-[#5a5a5a]]="localSettings.lyrics.textAlign === 'right'" class="flex-1 text-[10px] py-1 rounded-sm">R</button>
                                        </div>
                                    </div>
                                    <div class="flex flex-col space-y-1.5">
                                        <label class="text-[10px] font-medium text-[#969696]">Vertical Anchor</label>
                                        <div class="bg-[#3c3c3c] p-0.5 rounded flex border border-[#444444]">
                                            <button (click)="setAlignVertical('top')" [class.bg-[#5a5a5a]]="localSettings.lyrics.verticalAlignment === 'top'" class="flex-1 text-[10px] py-1 rounded-sm">T</button>
                                            <button (click)="setAlignVertical('middle')" [class.bg-[#5a5a5a]]="localSettings.lyrics.verticalAlignment === 'middle'" class="flex-1 text-[10px] py-1 rounded-sm mx-0.5">M</button>
                                            <button (click)="setAlignVertical('bottom')" [class.bg-[#5a5a5a]]="localSettings.lyrics.verticalAlignment === 'bottom'" class="flex-1 text-[10px] py-1 rounded-sm">B</button>
                                        </div>
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4 pt-2">
                                    <div class="flex flex-col space-y-1.5">
                                        <div class="flex justify-between items-center">
                                            <label class="text-[10px] font-medium text-[#969696]">Base Margin (%)</label>
                                            <span class="text-[9px] text-indigo-400 font-mono">{{ localSettings.lyrics.bottomOffset }}%</span>
                                        </div>
                                        <input type="range" [(ngModel)]="localSettings.lyrics.bottomOffset" (ngModelChange)="markDirty()"
                                               min="0" max="100" class="accent-[#007acc] h-1 bg-[#3c3c3c] rounded-lg cursor-pointer my-2">
                                    </div>
                                    <div class="flex flex-col space-y-1.5">
                                        <div class="flex justify-between items-center">
                                            <label class="text-[10px] font-medium text-[#969696]">Top Padding (%)</label>
                                            <span class="text-[9px] text-indigo-400 font-mono">{{ localSettings.lyrics.topOffset }}%</span>
                                        </div>
                                        <input type="range" [(ngModel)]="localSettings.lyrics.topOffset" (ngModelChange)="markDirty()"
                                               min="0" max="100" class="accent-[#007acc] h-1 bg-[#3c3c3c] rounded-lg cursor-pointer my-2">
                                    </div>
                                </div>
                            </div>

                            <div class="p-3 bg-indigo-950/20 rounded-md border border-indigo-500/10 flex items-start space-x-3">
                                <ng-icon name="heroAdjustmentsHorizontal" class="text-indigo-400 text-sm mt-0.5 shrink-0"></ng-icon>
                                <p class="text-[10px] text-indigo-200/60 font-medium italic leading-relaxed">
                                    Tip: Anchoring at <span class="text-indigo-300">Bottom</span> with a high <span class="text-indigo-300">Base Margin</span> is ideal for band-clearance on video walls.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            }

            <!-- DISPLAYS TAB -->
            @if (activeTab === 'displays') {
                <div class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-2">
                            <ng-icon name="heroComputerDesktop" class="text-[#858585] text-xs"></ng-icon>
                            <h3 class="text-[10px] font-bold uppercase tracking-widest text-[#858585]">Display Nodes</h3>
                        </div>
                        <button (click)="addDisplay()" 
                                class="bg-[#007acc] hover:bg-[#005a9e] text-white text-[9px] font-bold px-2 py-1 rounded-sm transition-all active:scale-95">
                            + Add Node
                        </button>
                    </div>

                    <div class="space-y-3">
                        @for (config of localSettings.displayConfigs; track config.id; let i = $index) {
                            <div class="bg-[#252526] p-4 rounded-md border border-[#333333] hover:border-[#454545] transition-all group shadow-sm">
                                <div class="flex items-start justify-between">
                                    <div class="space-y-4 flex-1">
                                        <div class="flex items-center space-x-3">
                                            <input [(ngModel)]="config.name" (ngModelChange)="markDirty()"
                                                   placeholder="Display Name"
                                                   class="bg-transparent border-none text-[#e1e1e1] text-xs font-bold p-0 w-40 focus:ring-0">
                                            <select [(ngModel)]="config.type" (ngModelChange)="markDirty()"
                                                    class="bg-[#3c3c3c] border border-[#444444] text-[#aaaaaa] text-[9px] px-1.5 py-0.5 rounded outline-none">
                                                <option value="audience">Audience</option>
                                                <option value="confidence">Confidence</option>
                                                <option value="lyrics">Lyrics</option>
                                                <option value="lower-thirds">Lower Thirds</option>
                                                <option value="custom">Custom</option>
                                            </select>
                                        </div>

                                        <div class="grid grid-cols-2 gap-4">
                                            <div class="space-y-1.5">
                                                <label class="text-[9px] font-bold text-[#858585] uppercase tracking-tighter">Physical Output</label>
                                                <select [(ngModel)]="config.deviceId" (ngModelChange)="markDirty()"
                                                        class="bg-[#3c3c3c] border border-[#444444] text-[#e1e1e1] text-[10px] px-2 py-1 rounded w-full outline-none">
                                                    <option value="">Auto (Default)</option>
                                                    @for (device of availableDisplays; track device.id) {
                                                        <option [value]="device.id">{{ device.name }}</option>
                                                    }
                                                </select>
                                            </div>
                                            <div class="space-y-1.5">
                                                <label class="text-[9px] font-bold text-[#858585] uppercase tracking-tighter">NDI Source (Optional)</label>
                                                <input type="text" [(ngModel)]="config.ndiOutput" (ngModelChange)="markDirty()"
                                                       placeholder="HarmonySync-NDI"
                                                       class="bg-[#3c3c3c] border border-[#444444] text-[#e1e1e1] text-[10px] px-2 py-1 rounded w-full outline-none">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="flex flex-col space-y-2 ml-4">
                                        <div class="flex items-center space-x-2">
                                            <label class="relative inline-flex items-center cursor-pointer scale-75">
                                                <input type="checkbox" [(ngModel)]="config.enabled" (ngModelChange)="markDirty()" class="sr-only peer">
                                                <div class="w-7 h-4 bg-[#333333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#007acc]"></div>
                                            </label>
                                        </div>
                                        <button (click)="removeDisplay(i)" 
                                                class="text-[#858585] hover:text-red-400 transition-colors p-1">
                                            <ng-icon name="heroTrash" class="text-sm"></ng-icon>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            }

            <!-- AUDIO TAB -->
            @if (activeTab === 'audio') {
                <div class="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <section>
                        <div class="flex items-center space-x-2 mb-4">
                            <ng-icon name="heroSpeakerWave" class="text-[#858585] text-xs"></ng-icon>
                            <h3 class="text-[10px] font-bold uppercase tracking-widest text-[#858585]">Audio Pipeline</h3>
                        </div>

                        <div class="bg-[#252526] p-4 rounded-md border border-[#333333] space-y-6">
                            <div class="flex flex-col space-y-1.5">
                                <label class="text-[10px] font-medium text-[#969696]">Main Output Device</label>
                                <select [(ngModel)]="localSettings.audio.audioOutputDevice" (ngModelChange)="markDirty()"
                                        class="w-full bg-[#3c3c3c] border border-[#444444] text-[#e1e1e1] text-xs px-3 py-2 rounded focus:outline-none focus:border-[#007acc] transition-all">
                                    <option value="">System Default</option>
                                    @for (device of availableAudioDevices; track device.id) {
                                        <option [value]="device.id">{{ device.name }}</option>
                                    }
                                </select>
                            </div>
                        </div>
                    </section>

                    <section>
                        <div class="flex items-center space-x-2 mb-4">
                            <ng-icon name="heroMusicalNote" class="text-[#858585] text-xs"></ng-icon>
                            <h3 class="text-[10px] font-bold uppercase tracking-widest text-[#858585]">MIDI Integration</h3>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="bg-[#252526] p-4 rounded-md border border-[#333333] space-y-4">
                                <div class="flex items-center space-x-2">
                                    <ng-icon name="heroMicrophone" class="text-blue-400 text-xs"></ng-icon>
                                    <label class="text-[10px] font-bold text-[#858585] uppercase tracking-tighter">MIDI Input</label>
                                </div>
                                <select [(ngModel)]="localSettings.audio.midiInputDevice" (ngModelChange)="markDirty()"
                                        class="w-full bg-[#3c3c3c] border border-[#444444] text-[#e1e1e1] text-xs px-3 py-2 rounded outline-none focus:border-[#007acc]">
                                    <option value="">None</option>
                                    @for (device of availableMidiInputDevices; track device.id) {
                                        <option [value]="device.id">{{ device.name }}</option>
                                    }
                                </select>
                            </div>

                            <div class="bg-[#252526] p-4 rounded-md border border-[#333333] space-y-4">
                                <div class="flex items-center space-x-2">
                                    <ng-icon name="heroSpeakerWave" class="text-green-400 text-xs"></ng-icon>
                                    <label class="text-[10px] font-bold text-[#858585] uppercase tracking-tighter">MIDI Output</label>
                                </div>
                                <select [(ngModel)]="localSettings.audio.midiOutputDevice" (ngModelChange)="markDirty()"
                                        class="w-full bg-[#3c3c3c] border border-[#444444] text-[#e1e1e1] text-xs px-3 py-2 rounded outline-none focus:border-[#007acc]">
                                    <option value="">None</option>
                                    @for (device of availableMidiOutputDevices; track device.id) {
                                        <option [value]="device.id">{{ device.name }}</option>
                                    }
                                </select>
                            </div>
                        </div>
                    </section>
                </div>
            }

            <!-- SERVICE ORDER TAB -->
            @if (activeTab === 'service-order') {
                <div class="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <section>
                        <div class="flex items-center space-x-2 mb-4">
                            <ng-icon name="heroQueueList" class="text-[#858585] text-xs"></ng-icon>
                            <h3 class="text-[10px] font-bold uppercase tracking-widest text-[#858585]">Import Automation</h3>
                        </div>

                        <div class="bg-[#252526] p-4 rounded-md border border-[#333333] space-y-6">
                            <div class="flex flex-col space-y-1.5">
                                <label class="text-[10px] font-medium text-[#969696]">Watch Folder (Zipped Services)</label>
                                <div class="flex space-x-2">
                                    <input type="text" [(ngModel)]="localSettings.serviceOrder.watchFolder" (ngModelChange)="markDirty()"
                                           placeholder="/path/to/watch/folder"
                                           class="flex-1 bg-[#3c3c3c] border border-[#444444] text-[#e1e1e1] text-xs px-3 py-2 rounded focus:outline-none focus:border-[#007acc] transition-all">
                                    <button (click)="browseWatchFolder()" class="bg-[#333] hover:bg-[#444] px-3 py-1.5 rounded border border-[#444] text-[10px] font-bold">Browse</button>
                                </div>
                            </div>

                            <div class="flex items-center space-x-6">
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" [(ngModel)]="localSettings.serviceOrder.autoImportOnStartup" (ngModelChange)="markDirty()" class="sr-only peer">
                                    <div class="w-8 h-4 bg-[#333333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#007acc]"></div>
                                    <span class="ml-3 text-[10px] text-[#cccccc]">Auto-import on startup</span>
                                </label>

                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" [(ngModel)]="localSettings.serviceOrder.advanceOnVideoEnd" (ngModelChange)="markDirty()" class="sr-only peer">
                                    <div class="w-8 h-4 bg-[#333333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#007acc]"></div>
                                    <span class="ml-3 text-[10px] text-[#cccccc]">Advance on Video End</span>
                                </label>
                            </div>
                        </div>
                    </section>
                </div>
            }
            <section class="pt-8 opacity-50 border-t border-[#333333] mt-8">
                <div class="flex flex-col space-y-1 text-[9px] text-[#858585]">
                    <span>Config synced: {{ localSettings.mixer.trackDefaults.length }} defaults | {{ localSettings.displayConfigs.length }} displays</span>
                    <span class="font-mono bg-[#1e1e1e] p-1 rounded inline-block">~/.harmonysync/app-settings.json</span>
                </div>
            </section>
        }
      </div>
    </div>
  `,
    styles: [`
    :host {
      display: block;
      height: 100%;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #444444;
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #555555;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    select option {
      background: #252526;
      color: #cccccc;
    }
    .mesh-gradient {
        background-color: #0c0c1e;
        background-image: 
            radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), 
            radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), 
            radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%);
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
        width: 12px;
        height: 12px;
        background: #007acc;
        cursor: pointer;
        border-radius: 50%;
        border: 2px solid #252526;
        box-shadow: 0 0 10px rgba(0, 122, 204, 0.4);
    }
    input[type="range"]::-webkit-slider-thumb:hover {
        background: #0098ff;
        transform: scale(1.1);
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
            heroMicrophone
        })
    ]
})
export class SettingsComponent implements OnInit {
    readonly configService = inject(ConfigService);
    readonly electronService = inject(ElectronService);

    activeTab: 'general' | 'displays' | 'audio' | 'service-order' = 'general';
    localSettings: AppSettings | null = null;
    isDirty = false;
    previewBgStyle: 'dark' | 'mesh' | 'animated' = 'dark';

    // Device discovery state
    availableDisplays: any[] = [];
    availableAudioDevices: any[] = [];
    availableMidiInputDevices: any[] = [];
    availableMidiOutputDevices: any[] = [];

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
    }

    private async loadDevices() {
        if (!this.electronService.isElectron) return;

        try {
            const displays = await this.electronService.invoke('settings:getAvailableDisplays');
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

    addService() {
        if (!this.localSettings) return;
        this.localSettings.serviceTimes.push({
            id: `service_${Date.now()}`,
            name: 'New Service',
            startTime: '09:00',
            endTime: '11:00'
        });
        this.markDirty();
    }

    removeService(index: number) {
        if (!this.localSettings) return;
        this.localSettings.serviceTimes.splice(index, 1);
        this.markDirty();
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
}
