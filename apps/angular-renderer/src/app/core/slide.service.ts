import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { ElectronService } from './electron.service';
import { Slide, LoadFromFolderResult } from '../models/slide.models';
import { from, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AudioService } from './audio.service';

@Injectable({
    providedIn: 'root'
})
export class SlideService {
    private readonly electron = inject(ElectronService);
    private readonly audio = inject(AudioService);

    // ── Reactive State ──────────────────────────────────────────────────────────
    readonly slides = signal<Slide[]>([]);
    readonly currentSlideIndex = signal<number>(-1);
    readonly isLoading = signal<boolean>(false);
    readonly error = signal<string | null>(null);

    // Derived state
    readonly currentSlide = computed(() => {
        const idx = this.currentSlideIndex();
        const list = this.slides();
        if (idx >= 0 && idx < list.length) return list[idx];
        return null;
    });

    readonly hasSlides = computed(() => this.slides().length > 0);

    /**
     * Load slides from a specific folder
     */
    loadSlides(folderPath: string): Observable<Slide[]> {
        this.isLoading.set(true);
        this.error.set(null);

        return from(this.electron.invoke('slides:loadSlides', folderPath)).pipe(
            map(res => res as Slide[]),
            tap(slides => {
                const mediaSlides = this.parseTimestamps((slides || []).filter(s => s.type !== 'lyric'));
                this.slides.set(mediaSlides);
                this.currentSlideIndex.set(mediaSlides.length > 0 ? 0 : -1);
                this.isLoading.set(false);
            }),
            catchError(err => {
                const msg = err?.message || String(err);
                this.error.set(`Failed to load slides: ${msg}`);
                this.isLoading.set(false);
                return of([]);
            })
        );
    }

    /**
     * Load both slides and tracks from a folder
     */
    loadFromFolder(folderPath: string): Observable<LoadFromFolderResult> {
        this.isLoading.set(true);
        this.error.set(null);

        return from(this.electron.invoke('slides:loadFromFolder', folderPath)).pipe(
            map(res => res as LoadFromFolderResult),
            tap(res => {
                const mediaSlides = this.parseTimestamps((res.slides || []).filter(s => s.type !== 'lyric'));
                this.slides.set(mediaSlides);
                this.currentSlideIndex.set(mediaSlides.length > 0 ? 0 : -1);

                // Auto-play background video if found
                const backgroundVideo = mediaSlides.find(s => s.type === 'video' && s.duration && s.duration < 60);
                if (backgroundVideo) {
                    console.log('[SlideService] Found background video, auto-playing with loop:', backgroundVideo.name);
                    this.electron.invoke('display:videoSlide', backgroundVideo.path, backgroundVideo.duration, true);
                }

                this.isLoading.set(false);
            }),
            catchError(err => {
                const msg = err?.message || String(err);
                this.error.set(`Failed to load folder: ${msg}`);
                this.isLoading.set(false);
                return of({ slides: [], tracks: [] });
            })
        );
    }

    /**
     * Select a slide by its index
     */
    selectSlide(index: number): void {
        if (index >= 0 && index < this.slides().length) {
            this.currentSlideIndex.set(index);
            const slide = this.slides()[index];

            // Notify display system based on type
            if (slide.type === 'image') {
                this.electron.emit('display-image-slide', { path: slide.path, name: slide.name });
            } else if (slide.type === 'video') {
                const isLoopable = slide.duration !== undefined && slide.duration < 60;
                this.electron.invoke('display:videoSlide', slide.path, slide.duration, isLoopable);
            }
        }
    }

    /**
     * Move to the next slide
     */
    nextSlide(): void {
        const nextIdx = this.currentSlideIndex() + 1;
        if (nextIdx < this.slides().length) {
            this.selectSlide(nextIdx);
        }
    }

    /**
     * Move to the previous slide
     */
    previousSlide(): void {
        const prevIdx = this.currentSlideIndex() - 1;
        if (prevIdx >= 0) {
            this.selectSlide(prevIdx);
        }
    }

    /**
     * Clear all slides
     */
    clear(): void {
        this.slides.set([]);
        this.currentSlideIndex.set(-1);
        this.error.set(null);
    }

    /**
     * Parsing logic for timestamped lyrics (LRC or similar)
     */
    private parseTimestamps(slides: Slide[]): Slide[] {
        return slides.map(slide => {
            if (slide.type === 'lyric' && slide.content) {
                const match = slide.content.match(/\[(\d+):(\d+\.\d+)\]/);
                if (match) {
                    const mins = parseInt(match[1], 10);
                    const secs = parseFloat(match[2]);
                    return { ...slide, startTime: mins * 60 + secs };
                }
            }
            return slide;
        });
    }

    // Effect for auto-advancing slides based on audio position
    private readonly autoAdvanceEffect = effect(() => {
        const pos = this.audio.currentPosition();
        if (!this.audio.isPlaying()) return;

        const slides = this.slides();
        const currentIdx = this.currentSlideIndex();

        // Find the best matching slide for the current position
        // We look for the latest slide whose startTime <= current position
        let bestIdx = -1;
        for (let i = 0; i < slides.length; i++) {
            const startTime = slides[i].startTime;
            if (startTime !== undefined && startTime <= pos) {
                bestIdx = i;
            }
        }

        if (bestIdx !== -1 && bestIdx !== currentIdx) {
            this.selectSlide(bestIdx);
        }
    });

    /**
     * Save a single slide changes
     */
    saveSlide(slide: Slide): Observable<void> {
        return from(this.electron.invoke('slides:saveSlide', slide)).pipe(
            tap(() => {
                this.slides.update(list => list.map(s => s.id === slide.id ? slide : s));
            }),
            catchError(err => {
                console.error('Failed to save slide:', err);
                return of(void 0);
            })
        );
    }

    /**
     * Delete a slide
     */
    deleteSlide(slideId: string): Observable<void> {
        return from(this.electron.invoke('slides:deleteSlide', slideId)).pipe(
            tap(() => {
                this.slides.update(list => list.filter(s => s.id !== slideId));
                // Adjust index if needed
                const currentIdx = this.currentSlideIndex();
                if (currentIdx >= this.slides().length) {
                    this.currentSlideIndex.set(this.slides().length - 1);
                }
            }),
            catchError(err => {
                console.error('Failed to delete slide:', err);
                return of(void 0);
            })
        );
    }
}
