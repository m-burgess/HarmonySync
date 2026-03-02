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
    VSCodePanelComponent,
    VSCodeButtonComponent,
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
    <app-vscode-panel title="Service Order" className="flex flex-col h-full bg-[#1e1e1e]">
      <div class="flex flex-col h-full p-3" id="service-order-container">
          
          <!-- Controls Header -->
          <div class="mb-4 space-y-2">
            <!-- Autoplay Toggle -->
            <div class="flex items-center justify-between p-2 bg-[#252526] rounded border border-[#333]">
              <div class="flex items-center gap-2">
                <input
                  id="autoplay-check"
                  type="checkbox"
                  [ngModel]="vm.autoplayEnabled()"
                  (ngModelChange)="vm.toggleAutoplay()"
                  class="w-3 h-3 accent-[#007acc]"
                />
                <label for="autoplay-check" class="text-[10px] font-bold text-[#858585] uppercase tracking-wider cursor-pointer">
                  Autoplay Next
                </label>
              </div>
              @if (vm.hasSongs()) {
                <span class="text-[10px] font-mono text-[#007acc]">
                  {{ vm.currentSongIndex() + 1 }}/{{ vm.songCount() }}
                </span>
              }
            </div>

            <!-- Add Button -->
            <app-vscode-button
              (onClick)="vm.addFolders()"
              icon="heroPlus"
              className="w-full text-[11px] py-1.5 font-bold uppercase tracking-wider"
              [disabled]="vm.isLoading()"
            >
              Add Folders
            </app-vscode-button>
          </div>

          <!-- Items List -->
          <div class="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
            @for (item of vm.serviceOrder(); track item.path; let i = $index) {
              <div
                class="group flex items-center justify-between px-2 py-2 rounded cursor-pointer border border-transparent transition-all hover:bg-[#2a2d2e]"
                [class.bg-[#37373d]]="vm.currentSongIndex() === i"
                [class.border-[#007acc]/30]="vm.currentSongIndex() === i"
                (click)="vm.loadItem(item, i)"
              >
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  @if (vm.currentSongIndex() === i) {
                    <div class="w-1 h-3 bg-[#007acc] rounded-full"></div>
                  } @else {
                    <ng-icon [name]="item.type === 'song' ? 'heroMusicalNote' : 'heroWindow'" class="text-[#858585] text-xs"></ng-icon>
                  }
                  <span class="text-[11px] truncate" [class.text-[#007acc]]="vm.currentSongIndex() === i" [class.font-bold]="vm.currentSongIndex() === i">
                    {{ item.name }}
                  </span>
                </div>
                
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button (click)="$event.stopPropagation(); vm.removeItem(item)" 
                          class="p-1 hover:bg-[#444] rounded text-[#858585] hover:text-red-400 transition-colors">
                    <ng-icon name="heroTrash" class="text-xs"></ng-icon>
                  </button>
                </div>
              </div>
            }
            
            @if (!vm.hasSongs() && !vm.isLoading()) {
              <div class="flex flex-col items-center justify-center py-20 opacity-20">
                 <ng-icon name="heroArrowDownTray" size="40" class="mb-4"></ng-icon>
                 <span class="text-[10px] uppercase font-bold tracking-[0.2em] text-center px-4">Drag folders here or use 'Add'</span>
              </div>
            }
          </div>
      </div>
    </app-vscode-panel>
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
