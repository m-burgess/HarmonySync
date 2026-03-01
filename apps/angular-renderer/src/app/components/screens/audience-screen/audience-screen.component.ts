import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ElectronService } from '../../../core/electron.service';
import { ConfigService } from '../../../core/config.service';
import { LyricTransitionService, TransitionContent } from '../../../core/lyric-transition.service';

interface LyricContent {
    type: 'lyrics';
    text: string[];
}

interface ImageContent {
    type: 'image';
    path: string;
    name: string;
}

interface VideoContent {
    type: 'video';
    videoId: string;
}

type Content = LyricContent | ImageContent | VideoContent | null;

declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

@Component({
    selector: 'app-audience-screen',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './audience-screen.component.html',
    styleUrl: './audience-screen.component.scss'
})
export class AudienceScreenComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('youtubePlayerShell') youtubePlayerShell!: ElementRef;
    @ViewChild('backgroundVideoRef') backgroundVideoRef!: ElementRef<HTMLVideoElement>;

    currentContent = computed(() => this.transition.currentContent());
    backgroundVideo: string | null = null;
    isLooping: boolean = false;
    player: any = null;
    private intervalId: any = null;

    private transition = inject(LyricTransitionService);

    private unlisteners: (() => void)[] = [];
    private electronService = inject(ElectronService);
    private configService = inject(ConfigService);
    private titleService = inject(Title);

    // Computed styles based on settings
    lyricStyles = computed(() => {
        const s = this.configService.settings()?.lyrics;
        if (!s) return {
            'justify-content': 'center',
            'align-items': 'center',
            'text-align': 'center',
            'font-family': 'Inter',
            'font-size': '10vh',
            'color': 'white'
        };

        // Hard-force center for now as requested
        const textAlign = s.textAlign || 'center';

        return {
            'font-family': s.fontFamily || 'Inter',
            'font-size': (s.fontSize || 80) + 'px',
            'font-weight': s.fontWeight || 'bold',
            'color': s.color || 'white',
            'text-shadow': s.textShadow || 'none',
            'text-align': 'center',
            'padding-top': '0',
            'padding-bottom': '0',
            'justify-content': 'center',
            'align-items': 'center'
        };
    });

    constructor() { }

    ngOnInit() {
        this.titleService.setTitle('Audience');
        this.setupEventListeners();
        this.syncWithCurrentState();
    }

    private async syncWithCurrentState() {
        try {
            const state = await this.electronService.invoke('display:getCurrentState');
            console.log('Audience: syncing with current state', state);
            if (state) {
                if (state.video) {
                    this.backgroundVideo = this.electronService.convertFileSrc(state.video.path);
                    this.isLooping = !!state.video.loop;
                }
                if (state.slide) {
                    if (state.slide.type === 'lyrics') {
                        this.transition.transitionTo({ type: 'lyrics', text: state.slide.text });
                    } else if (state.slide.type === 'image') {
                        this.transition.transitionTo({
                            type: 'image',
                            path: this.electronService.convertFileSrc(state.slide.path),
                            name: state.slide.name
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Audience: failed to sync state', error);
        }
    }

    ngAfterViewInit() {
        // Check if we need to initialize YouTube
        if (this.currentContent()?.type === 'video') {
            this.initYouTubePlayer();
        }
    }

    ngOnDestroy() {
        this.cleanup();
    }

    private setupEventListeners() {
        // Background style
        const ulBackground = this.electronService.on('set-background', (payload: any) => {
            console.log('Audience: set-background event received');
            const head = document.getElementsByTagName('head')[0];
            let oldStyle = document.getElementById('song-background-style');
            if (oldStyle) {
                head.removeChild(oldStyle);
            }

            const style = document.createElement('style');
            style.id = 'song-background-style';
            style.textContent = payload;
            head.appendChild(style);
        });
        if (ulBackground) this.unlisteners.push(ulBackground);

        // Lyrics
        const ulLyrics = this.electronService.on('display-lyrics', (payload: any) => {
            console.log('Audience: display-lyrics event received', payload);
            this.transition.transitionTo({ type: 'lyrics', text: payload.lines });
        });
        if (ulLyrics) this.unlisteners.push(ulLyrics);

        // Image
        const ulImage = this.electronService.on('display-image-slide', (payload: any) => {
            console.log('Audience: display-image-slide event received', payload);
            this.transition.transitionTo({
                type: 'image',
                path: this.electronService.convertFileSrc(payload.path),
                name: payload.name
            });
        });
        if (ulImage) this.unlisteners.push(ulImage);

        // Clear
        const ulClear = this.electronService.on('clear-lyric-display', () => {
            console.log('Audience: clear-lyric-display event received');
            this.transition.clear();
        });
        if (ulClear) this.unlisteners.push(ulClear);

        // YouTube Navigate
        const ulNavigate = this.electronService.on('navigate', (payload: any) => {
            console.log('Audience: navigate event received', payload);
            this.transition.transitionTo({ type: 'video', videoId: payload.videoId });
            this.initYouTubePlayer();
        });
        if (ulNavigate) this.unlisteners.push(ulNavigate);

        // Background Video Start
        const ulStartBGVideo = this.electronService.on('start-background-video', (payload: any) => {
            console.log('Audience: start-background-video event received', payload);
            this.backgroundVideo = this.electronService.convertFileSrc(payload.path);
        });
        if (ulStartBGVideo) this.unlisteners.push(ulStartBGVideo);

        const ulDisplayVideo = this.electronService.on('display-video-slide', (payload: any) => {
            console.log('Audience: display-video-slide event received', payload);
            this.backgroundVideo = this.electronService.convertFileSrc(payload.path);
            this.isLooping = !!payload.loop;
        });
        if (ulDisplayVideo) this.unlisteners.push(ulDisplayVideo);

        // Background Video Stop
        const ulStopBGVideo = this.electronService.on('stop-background-video', () => {
            console.log('Audience: stop-background-video event received');
            this.backgroundVideo = null;
        });
        if (ulStopBGVideo) this.unlisteners.push(ulStopBGVideo);

        // YouTube Controls
        const ulPlayVideo = this.electronService.on('play-video', () => {
            console.log('Audience: play-video');
            if (this.player && this.player.playVideo) this.player.playVideo();
        });
        if (ulPlayVideo) this.unlisteners.push(ulPlayVideo);

        const ulPauseVideo = this.electronService.on('pause-video', () => {
            console.log('Audience: pause-video');
            if (this.player && this.player.pauseVideo) this.player.pauseVideo();
        });
        if (ulPauseVideo) this.unlisteners.push(ulPauseVideo);

        const ulSeekVideo = this.electronService.on('seek-video', (payload: any) => {
            console.log('Audience: seek-video', payload);
            if (this.player && this.player.seekTo) this.player.seekTo(payload.time, true);
        });
        if (ulSeekVideo) this.unlisteners.push(ulSeekVideo);

        const ulVideoVolume = this.electronService.on('set-video-volume', (payload: any) => {
            console.log('Audience: set-video-volume', payload);
            if (this.player && this.player.setVolume) this.player.setVolume(payload.volume * 100);
        });
        if (ulVideoVolume) this.unlisteners.push(ulVideoVolume);
    }

    private initYouTubePlayer() {
        const current = this.currentContent();
        if (current?.type !== 'video') return;

        if (this.player && typeof this.player.destroy === 'function') {
            this.player.destroy();
        }

        const onPlayerReady = (event: any) => {
            event.target.playVideo();
        };

        const onPlayerStateChange = (event: any) => {
            console.log('YouTube player state changed:', event.data);
            if (window.YT && event.data === window.YT.PlayerState.PLAYING) {
                if (this.intervalId) clearInterval(this.intervalId);
                this.intervalId = setInterval(() => {
                    const currentTime = event.target.getCurrentTime();
                    const duration = event.target.getDuration();
                    this.electronService.send('video-progress', { currentTime, duration });

                    const el = document.getElementById('youtube-player');
                    if (duration - currentTime <= 3) {
                        el?.classList.add('fade-out');
                    } else {
                        el?.classList.remove('fade-out');
                    }
                }, 1000);
            } else if (window.YT && event.data === window.YT.PlayerState.ENDED) {
                this.electronService.send('video-ended', 'YouTube video finished');
                document.getElementById('youtube-player')?.classList.remove('fade-out');
            } else {
                if (this.intervalId) {
                    clearInterval(this.intervalId);
                    this.intervalId = null;
                }
            }
        };

        const createPlayer = () => {
            console.log('Creating YouTube player');
            this.player = new window.YT.Player('youtube-player', {
                height: '100%',
                width: '100%',
                videoId: (current as VideoContent).videoId,
                playerVars: {
                    autoplay: 1,
                    controls: 0,
                    modestbranding: 1,
                },
                events: {
                    onReady: onPlayerReady,
                    onStateChange: onPlayerStateChange,
                },
            });
        };

        if (window.YT && window.YT.Player) {
            setTimeout(createPlayer, 0);
        } else {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            if (firstScriptTag && firstScriptTag.parentNode) {
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            }

            window.onYouTubeIframeAPIReady = () => {
                setTimeout(createPlayer, 0);
            };
        }
    }

    private cleanup() {
        this.unlisteners.forEach(unlisten => unlisten());
        if (this.intervalId) clearInterval(this.intervalId);
        if (this.player && typeof this.player.destroy === 'function') {
            this.player.destroy();
        }
    }

    get showLyrics(): boolean {
        const c = this.currentContent();
        // If content is lyrics OR image, show it.
        // If there is no specific content (c is null or clear) BUT background video is active,
        // we still want the layer available (though it will be empty).
        return !!c && (c.type === 'lyrics' || c.type === 'image') || (!!this.backgroundVideo && (!c || c.type === 'clear'));
    }

    get showVideo(): boolean {
        const c = this.currentContent();
        return !!c && c.type === 'video';
    }

    get lyricLines(): string[] {
        const c = this.currentContent();
        return c?.type === 'lyrics' ? c.text || [] : [];
    }

    get imagePath(): string | null {
        const c = this.currentContent();
        return c?.type === 'image' ? c.path || null : null;
    }

    get imageName(): string | null {
        const c = this.currentContent();
        return c?.type === 'image' ? c.name || null : null;
    }

    get opacity(): number {
        return this.transition.contentOpacity();
    }
}
