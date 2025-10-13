/**
 * SetlistManager Component - Left column displaying service order
 * Inspired by VS Code's explorer sidebar
 */

import { Component } from '../Component';
import { ServiceOrderItem, Slide, Track } from '../../types';

export interface SetlistManagerOptions {
  parent?: HTMLElement;
  onServiceOrderChange?: (serviceOrder: ServiceOrderItem[]) => void;
  onSlideChange?: (slides: Slide[]) => void;
  onTrackChange?: (tracks: Track[]) => void;
}

export class SetlistManager extends Component<HTMLDivElement> {
  private serviceOrder: ServiceOrderItem[] = [];
  private options: SetlistManagerOptions;

  constructor(options: SetlistManagerOptions = {}) {
    super('div', {
      className: 'setlist-manager',
      parent: options.parent,
    });
    this.options = options;
    this.render();
  }

  setServiceOrder(order: ServiceOrderItem[]): void {
    this.serviceOrder = order;
    this.render();
  }

  getServiceOrder(): ServiceOrderItem[] {
    return this.serviceOrder;
  }

  render(): void {
    const html = `
      <div class="setlist-header">
        <h2 class="setlist-title">Service Order</h2>
        <button class="icon-button" data-action="add" title="Add Item">
          <span class="codicon codicon-add"></span>
        </button>
      </div>
      <div class="setlist-content">
        ${this.renderServiceOrder()}
      </div>
    `;
    this.setHTML(html);
    this.attachEventListeners();
  }

  private renderServiceOrder(): string {
    if (this.serviceOrder.length === 0) {
      return '<div class="empty-state">No items in service order</div>';
    }

    return this.serviceOrder
      .map(
        (item, index) => `
        <div class="setlist-item ${item.loaded ? 'loaded' : ''}" data-index="${index}">
          <div class="setlist-item-header">
            <span class="setlist-item-icon">
              ${item.type === 'song' ? '♪' : '📄'}
            </span>
            <span class="setlist-item-name">${this.escapeHtml(item.name)}</span>
            <div class="setlist-item-actions">
              <button class="icon-button" data-action="load" data-index="${index}" title="Load">
                <span class="codicon codicon-play"></span>
              </button>
              <button class="icon-button" data-action="remove" data-index="${index}" title="Remove">
                <span class="codicon codicon-trash"></span>
              </button>
            </div>
          </div>
          ${item.loaded ? `<div class="setlist-item-info">${item.slides.length} slides • ${item.tracks.length} tracks</div>` : ''}
        </div>
      `
      )
      .join('');
  }

  private attachEventListeners(): void {
    // Handle load button clicks
    const loadButtons = this.element.querySelectorAll('[data-action="load"]');
    loadButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        const index = parseInt((e.target as HTMLElement).closest('[data-index]')?.getAttribute('data-index') || '-1');
        if (index >= 0) {
          this.loadItem(index);
        }
      });
    });

    // Handle remove button clicks
    const removeButtons = this.element.querySelectorAll('[data-action="remove"]');
    removeButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        const index = parseInt((e.target as HTMLElement).closest('[data-index]')?.getAttribute('data-index') || '-1');
        if (index >= 0) {
          this.removeItem(index);
        }
      });
    });
  }

  private async loadItem(index: number): Promise<void> {
    if (index < 0 || index >= this.serviceOrder.length) {
      return;
    }

    const item = this.serviceOrder[index];
    
    // In a real implementation, this would call the Tauri backend
    // For now, we'll just mark it as loaded
    item.loaded = true;
    
    if (this.options.onSlideChange) {
      this.options.onSlideChange(item.slides);
    }
    
    if (this.options.onTrackChange) {
      this.options.onTrackChange(item.tracks);
    }
    
    if (this.options.onServiceOrderChange) {
      this.options.onServiceOrderChange(this.serviceOrder);
    }
    
    this.render();
  }

  private removeItem(index: number): void {
    if (index < 0 || index >= this.serviceOrder.length) {
      return;
    }

    this.serviceOrder.splice(index, 1);
    
    if (this.options.onServiceOrderChange) {
      this.options.onServiceOrderChange(this.serviceOrder);
    }
    
    this.render();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
