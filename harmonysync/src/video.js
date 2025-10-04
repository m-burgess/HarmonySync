import * as Tauri from '@tauri-apps/api';
import { invoke } from '@tauri-apps/api/core';

class VideoManager {
    constructor() {
        this.currentVideoPath = null;
        this.currentVideoDuration = 0;
    }

    async getVideoMetadata(videoPath) {
        console.log(`Getting metadata for video: ${videoPath}`);
        try {
            const metadata = await invoke('get_video_metadata', { path: videoPath });
            return metadata;
        } catch (error) {
            console.error('Failed to get video metadata:', error);
            return null;
        }
    }

    async playVideo(videoPath, duration) {
        this.currentVideoPath = videoPath;
        this.currentVideoDuration = duration;
        console.log(`Attempting to play video directly with VLC: ${videoPath}`);
        try {
            // Invoke the Rust command to open VLC directly
            await invoke('stream_video_with_vlc', { videoPath: videoPath });
            console.log(`VLC launched to play video: ${videoPath}`);

            // No longer emitting display-video-slide as VLC handles display
            // We might want to emit an event to clear the audience screen or show a placeholder
            Tauri.event.emit('clear-lyric-display'); // Clear any existing content
            Tauri.event.emit('clear-confidence-display'); // Clear confidence monitor

        } catch (error) {
            console.error('Failed to launch VLC to play video:', error);
        }
    }

    async transcodeVideo(inputPath, outputPath) {
        console.log(`Transcoding video from ${inputPath} to ${outputPath}`);
        try {
            await invoke('transcode_video', { inputPath: inputPath, outputPath: outputPath });
            console.log('Video transcoding successful.');
            return true;
        } catch (error) {
            console.error('Video transcoding failed:', error);
            return false;
        }
    }

    stopVideo() {
        console.log('Stopping video');
        this.currentVideoPath = null;
        this.currentVideoDuration = 0;
        // This will eventually invoke a Tauri command to stop video on audience and clear countdown
        // For now, we'll just log it.
    }
}

export const videoManager = new VideoManager();
