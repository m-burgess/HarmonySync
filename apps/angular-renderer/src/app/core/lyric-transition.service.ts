import { Injectable, signal } from '@angular/core';

export interface TransitionContent {
    type: 'lyrics' | 'image' | 'video' | 'youtube' | 'canva' | 'clear';
    text?: string[];
    path?: string;
    name?: string;
    videoId?: string;
    url?: string;
}

@Injectable({
    providedIn: 'root'
})
export class LyricTransitionService {
    private transitionDuration = 200; // ms

    // Signals for UI binding
    readonly currentContent = signal<TransitionContent | null>(null);
    readonly isTransitioning = signal<boolean>(false);
    readonly contentOpacity = signal<number>(1);

    /**
     * Smoothly transition to new content
     */
    async transitionTo(newContent: TransitionContent | null): Promise<void> {
        if (this.isTransitioning()) {
            // If already transitioning, we could queue, 
            // but for lyrics, latest is usually best.
            // Simplified: just proceed after a small delay or cancel current.
        }

        this.isTransitioning.set(true);

        try {
            // 1. Fade out current content
            if (this.currentContent() !== null) {
                this.contentOpacity.set(0);
                await this.wait(this.transitionDuration);
            }

            // 2. Switch content
            this.currentContent.set(newContent);

            // 3. Fade in new content
            if (newContent !== null) {
                // Ensure DOM has a moment to update if needed
                await this.wait(20);
                this.contentOpacity.set(1);
                await this.wait(this.transitionDuration);
            }

        } catch (error) {
            console.error('Lyric transition failed:', error);
        } finally {
            this.isTransitioning.set(false);
        }
    }

    /**
     * Clear display with fade out
     */
    async clear(): Promise<void> {
        await this.transitionTo(null);
    }

    private wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
