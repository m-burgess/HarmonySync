import { inject, Injectable, signal, computed } from '@angular/core';
import { SlideService } from '../core/slide.service';
import { Slide } from '../models/slide.models';

@Injectable({
    providedIn: 'root'
})
export class SlideViewModel {
    private slideService = inject(SlideService);

    // Expose signals from service or wrap them
    slides = this.slideService.slides;
    currentSlideIndex = this.slideService.currentSlideIndex;
    isLoading = this.slideService.isLoading;
    error = this.slideService.error;

    // Computed
    hasSlides = this.slideService.hasSlides;
    currentSlide = this.slideService.currentSlide;

    slideCount = computed(() => this.slides().length);

    hasNextSlide = computed(() => {
        const idx = this.currentSlideIndex();
        return idx >= 0 && idx < this.slides().length - 1;
    });

    hasPreviousSlide = computed(() => {
        return this.currentSlideIndex() > 0;
    });

    // Actions
    selectSlide(index: number) {
        this.slideService.selectSlide(index);
    }

    nextSlide() {
        this.slideService.nextSlide();
    }

    previousSlide() {
        this.slideService.previousSlide();
    }

    clearSlides() {
        this.slideService.clear();
    }

    deleteSlide(slideId: string) {
        this.slideService.deleteSlide(slideId).subscribe();
    }

    formatSlideName(slide: Slide | null): string {
        if (!slide) return '';
        return slide.title || slide.name || 'Untitled Slide';
    }
}
