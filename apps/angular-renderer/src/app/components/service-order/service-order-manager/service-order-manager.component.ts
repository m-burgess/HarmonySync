import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VSCodeInputComponent } from '../../vscode-ui/vscode-input/vscode-input.component';
import { VSCodeButtonComponent } from '../../vscode-ui/vscode-button/vscode-button.component';
import { VSCodePanelComponent } from '../../vscode-ui/vscode-panel/vscode-panel.component';
import { ServiceOrderService, ServiceOrderItem } from '../../../core/service-order.service';
import { NgIconComponent } from '@ng-icons/core';

@Component({
    selector: 'app-service-order-manager',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        VSCodeInputComponent,
        VSCodeButtonComponent,
        VSCodePanelComponent,
        NgIconComponent
    ],
    template: `
    <app-vscode-panel title="Service Order" className="flex flex-col h-full bg-vscode-sidebar-bg">
      <div class="flex flex-col h-full p-2" id="service-order-col">
          <!-- Crossfade Control -->
          <div class="mb-2 p-2 bg-vscode-item-hover-bg rounded border border-vscode-border">
            <div class="flex items-center gap-2 text-[10px]">
              <label for="crossfade-duration" class="font-medium text-vscode-foreground opacity-70">
                Crossfade:
              </label>
              <app-vscode-input
                id="crossfade-duration"
                type="range"
                min="500"
                max="8000"
                step="500"
                [value]="crossfadeDuration.toString()"
                (onChange)="onCrossfadeChange($event)"
                className="w-20"
              ></app-vscode-input>
              <span class="text-vscode-foreground opacity-50 min-w-fit">
                {{ (crossfadeDuration / 1000).toFixed(1) }}s
              </span>
            </div>
          </div>

          <!-- Autoplay Control -->
          <div class="mb-2 p-2 bg-vscode-item-hover-bg rounded border border-vscode-border">
            <div class="flex items-center gap-2 text-[10px]">
              <app-vscode-input
                id="autoplay-enabled"
                type="checkbox"
                [value]="autoplayEnabled ? 'true' : 'false'"
                (onChange)="toggleAutoplay()"
                className="w-3 h-3"
              ></app-vscode-input>
              <label for="autoplay-enabled" class="font-medium text-vscode-foreground opacity-70">
                Autoplay next song
              </label>
              <span *ngIf="serviceOrderService.currentSongIndex() >= 0" class="text-vscode-foreground opacity-50 ml-auto">
                {{ serviceOrderService.currentSongIndex() + 1 }}/{{ serviceOrderService.serviceOrder().length }}
              </span>
            </div>
          </div>

          <!-- Add Folder Button -->
          <div class="flex gap-2 mb-3">
            <app-vscode-button
              (onClick)="addFolders()"
              icon="heroPlus"
              className="w-full text-xs py-1"
              [disabled]="serviceOrderService.isLoading()"
            >
              Add Folders
            </app-vscode-button>
          </div>

          <!-- Service Order Items -->
          <div id="service-order" class="flex-1 overflow-y-auto space-y-1">
            <div
              *ngFor="let item of serviceOrderService.serviceOrder(); let i = index"
              class="service-order-item group px-2 py-1.5 rounded cursor-pointer border border-transparent transition-all hover:bg-vscode-item-hover-bg hover:border-vscode-border"
              [ngClass]="{'bg-vscode-focus-border/20 border-vscode-focus-border': serviceOrderService.currentSongIndex() === i}"
              (click)="handleItemClick(item, i)"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <span *ngIf="serviceOrderService.currentSongIndex() === i" class="text-vscode-focus-border text-[10px]">▶</span>
                  <ng-icon [name]="item.type === 'song' ? 'heroMusicalNote' : 'heroWindow'" class="opacity-50"></ng-icon>
                  <span class="text-xs truncate text-vscode-foreground" [title]="item.name">
                    {{ item.name }}
                  </span>
                </div>
                
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <app-vscode-button 
                    variant="icon" 
                    icon="heroPencil" 
                    title="Edit Lyrics"
                    *ngIf="item.type === 'song'"
                    (onClick)="editLyrics($event, item)">
                  </app-vscode-button>
                  <app-vscode-button 
                    variant="icon" 
                    icon="heroTrash" 
                    title="Remove"
                    (onClick)="removeItem($event, item)">
                  </app-vscode-button>
                </div>
              </div>
            </div>
            
            <div *ngIf="serviceOrderService.serviceOrder().length === 0" class="flex flex-col items-center justify-center py-10 opacity-30">
               <ng-icon name="heroArrowDownTray" size="32" class="mb-2"></ng-icon>
               <span class="text-[10px] uppercase font-bold tracking-widest">Service Order Empty</span>
            </div>
          </div>
      </div>
    </app-vscode-panel>
  `,
    styles: [`
    :host { display: block; height: 100%; }
    .service-order-item {
      user-select: none;
    }
  `]
})
export class ServiceOrderManagerComponent implements OnInit, OnDestroy {
    serviceOrderService = inject(ServiceOrderService);

    crossfadeDuration: number = 1000;
    autoplayEnabled: boolean = false;

    ngOnInit() {
        console.log('[ServiceOrderManager] Component mounted');
    }

    ngOnDestroy() {
        // Cleanup listeners handled by service
    }

    onCrossfadeChange(value: string) {
        this.crossfadeDuration = parseInt(value, 10);
    }

    toggleAutoplay() {
        this.autoplayEnabled = !this.autoplayEnabled;
    }

    async addFolders() {
        await this.serviceOrderService.addFolders();
    }

    handleItemClick(item: ServiceOrderItem, index: number) {
        this.serviceOrderService.loadItem(item, index);
    }

    removeItem(event: Event, item: ServiceOrderItem) {
        event.stopPropagation();
        this.serviceOrderService.removeItem(item);
    }

    editLyrics(event: Event, item: ServiceOrderItem) {
        event.stopPropagation();
    }
}
