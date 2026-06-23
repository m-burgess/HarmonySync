import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceOrderViewModel } from '../../../viewmodels/service-order.viewmodel';
import { ServiceOrderItem } from '../../../core/service-order.service';
import { VSCodePanelComponent } from '../../vscode-ui/vscode-panel/vscode-panel.component';
import { VSCodeButtonComponent } from '../../vscode-ui/vscode-button/vscode-button.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroMusicalNote,
  heroWindow,
  heroPlus,
  heroTrash,
  heroPencil,
  heroArrowDownTray
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-service-order',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIconComponent
  ],
  providers: [
    provideIcons({
      heroMusicalNote,
      heroWindow,
      heroPlus,
      heroTrash,
      heroPencil,
      heroArrowDownTray
    })
  ],
  template: `
      <div class="flex flex-col h-full p-4 w-full bg-transparent" id="service-order-container">
          
          <!-- Controls Header -->
          <div class="mb-5 space-y-3">
            <!-- Autoplay Toggle -->
            <div class="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-800/50 shadow-inner">
              <div class="flex items-center gap-3">
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    id="autoplay-check"
                    type="checkbox"
                    [ngModel]="vm.autoplayEnabled()"
                    (ngModelChange)="vm.toggleAutoplay()"
                    class="sr-only peer"
                  />
                  <div class="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500 shadow-inner"></div>
                </label>
                <label for="autoplay-check" class="text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-200 transition-colors">
                  Autoplay Next
                </label>
              </div>
              @if (vm.hasSongs()) {
                <span class="text-[10px] font-black text-cyan-500 tracking-widest bg-cyan-500/10 px-2 py-1 rounded-md border border-cyan-500/20">
                  {{ vm.currentSongIndex() + 1 }}/{{ vm.songCount() }}
                </span>
              }
            </div>

            <!-- Add Button -->
            <button
              (click)="vm.addFolders()"
              class="w-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 hover:text-white text-xs py-2.5 rounded-xl font-bold uppercase tracking-widest transition-all duration-200 shadow-sm flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50"
              [disabled]="vm.isLoading()"
            >
              <ng-icon name="heroPlus" class="text-sm"></ng-icon>
              Add Folders
            </button>
          </div>

          <!-- Items List -->
          <div class="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
            @for (item of vm.serviceOrder(); track item.path; let i = $index) {
              <div
                class="group flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer border transition-all duration-300 shadow-sm"
                [class.bg-slate-800/40]="vm.currentSongIndex() !== i"
                [class.border-slate-800/50]="vm.currentSongIndex() !== i"
                [class.hover:bg-slate-700/50]="vm.currentSongIndex() !== i"
                [class.bg-cyan-500/15]="vm.currentSongIndex() === i"
                [class.border-cyan-500/30]="vm.currentSongIndex() === i"
                [class.shadow-cyan-900/20]="vm.currentSongIndex() === i"
                (click)="vm.loadItem(item, i)"
              >
                <div class="flex items-center gap-3 flex-1 min-w-0">
                  @if (vm.currentSongIndex() === i) {
                    <div class="w-1.5 h-4 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div>
                  } @else {
                    <div class="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center border border-slate-700/50">
                        <ng-icon [name]="item.type === 'song' ? 'heroMusicalNote' : 'heroWindow'" class="text-slate-400 text-sm group-hover:text-cyan-400 transition-colors"></ng-icon>
                    </div>
                  }
                  <div class="flex flex-col">
                      <span class="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-0.5">Item {{i+1}}</span>
                      <span class="text-sm truncate font-medium" [class.text-cyan-300]="vm.currentSongIndex() === i" [class.font-bold]="vm.currentSongIndex() === i" [class.text-slate-200]="vm.currentSongIndex() !== i">
                        {{ item.name }}
                      </span>
                  </div>
                </div>
                
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button (click)="$event.stopPropagation(); vm.removeItem(item)" 
                          class="p-2 hover:bg-rose-500/20 rounded-lg text-slate-500 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition-all">
                    <ng-icon name="heroTrash" class="text-sm"></ng-icon>
                  </button>
                </div>
              </div>
            }
            
            @if (!vm.hasSongs() && !vm.isLoading()) {
              <div class="flex flex-col items-center justify-center py-20 opacity-30 mt-10">
                 <ng-icon name="heroArrowDownTray" class="text-4xl mb-4 text-slate-400"></ng-icon>
                 <span class="text-xs uppercase font-bold tracking-[0.2em] text-center text-slate-400 px-4">Drag folders here or use 'Add'</span>
              </div>
            }
          </div>
      </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .custom-scrollbar {
      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-track { background: transparent; }
      &::-webkit-scrollbar-thumb { 
        background: #333; 
        border-radius: 2px;
        &:hover { background: #444; }
      }
    }
  `]
})
export class ServiceOrderComponent implements OnInit {
  vm = inject(ServiceOrderViewModel);

  ngOnInit() {
    // Sync logic if needed
  }
}
