import { inject, Injectable, signal, computed } from '@angular/core';
import { ServiceOrderService, ServiceOrderItem } from '../core/service-order.service';

@Injectable({
    providedIn: 'root'
})
export class ServiceOrderViewModel {
    serviceOrderService = inject(ServiceOrderService);

    // Expose signals from service
    serviceOrder = this.serviceOrderService.serviceOrder;
    currentSongIndex = this.serviceOrderService.currentSongIndex;
    isLoading = this.serviceOrderService.isLoading;
    error = this.serviceOrderService.error;
    autoplayEnabled = this.serviceOrderService.autoplayEnabled;

    // Computed
    hasSongs = this.serviceOrderService.hasSongs;
    currentSong = this.serviceOrderService.currentSong;

    songCount = computed(() => this.serviceOrder().length);

    // Actions
    toggleAutoplay() {
        this.serviceOrderService.toggleAutoplay();
    }

    async addFolders() {
        await this.serviceOrderService.addFolders();
    }

    async refreshCurrentItem() {
        await this.serviceOrderService.refreshCurrentItem();
    }

    loadItem(item: ServiceOrderItem, index: number) {
        this.serviceOrderService.loadItem(item, index);
    }

    removeItem(item: ServiceOrderItem) {
        this.serviceOrderService.removeItem(item);
    }

    async advanceToNext() {
        await this.serviceOrderService.advanceToNext();
    }
}
