import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElectronService } from '../../../core/electron.service';

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

    content: Content = null;
    backgroundVideo: string | null = null;
    player: any = null;
    private intervalId: any = null;

    private unlisteners: (() => void)[] = [];

    constructor(private electronService: ElectronService) { }

    ngOnInit() {
        this.setupEventListeners();
    }

    ngAfterViewInit() {
        // Check if we need to initialize YouTube
        if (this.content?.type === 'video') {
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
            this.content = { type: 'lyrics', text: payload.lines };
        });
        if (ulLyrics) this.unlisteners.push(ulLyrics);

        // Image
        const ulImage = this.electronService.on('display-image-slide', (payload: any) => {
            console.log('Audience: display-image-slide event received', payload);
            this.content = { type: 'image', path: this.electronService.convertFileSrc(payload.path), name: payload.name };
        });
        if (ulImage) this.unlisteners.push(ulImage);

        // Clear
        const ulClear = this.electronService.on('clear-lyric-display', () => {
            console.log('Audience: clear-lyric-display event received');
            this.content = null;
        });
        if (ulClear) this.unlisteners.push(ulClear);

        // YouTube Navigate
        const ulNavigate = this.electronService.on('navigate', (payload: any) => {
            console.log('Audience: navigate event received', payload);
            this.content = { type: 'video', videoId: payload.videoId };
            this.initYouTubePlayer();
        });
        if (ulNavigate) this.unlisteners.push(ulNavigate);

        // Background Video Start
        const ulStartBGVideo = this.electronService.on('start-background-video', (payload: any) => {
            console.log('Audience: start-background-video event received', payload);
            this.backgroundVideo = this.electronService.convertFileSrc(payload.path);
        });
        if (ulStartBGVideo) this.unlisteners.push(ulStartBGVideo);

        // Background Video Stop
        const ulStopBGVideo = this.electronService.on('stop-background-video', () => {
            console.log('Audience: stop-background-video event received');
            this.backgroundVideo = null;
        });
        if (ulStopBGVideo) this.unlisteners.push(ulStopBGVideo);
    }

    private initYouTubePlayer() {
        if (this.content?.type !== 'video') return;

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
                videoId: (this.content as VideoContent).videoId,
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
        return !!this.content && (this.content.type === 'lyrics' || this.content.type === 'image');
    }

    get showVideo(): boolean {
        return !!this.content && this.content.type === 'video';
    }

    get lyricLines(): string[] {
        return this.content?.type === 'lyrics' ? (this.content as LyricContent).text : [];
    }

    get imagePath(): string {
        return this.content?.type === 'image' ? (this.content as ImageContent).path : '';
    }

    get imageName(): string {
        return this.content?.type === 'image' ? (this.content as ImageContent).name : '';
    }
}
