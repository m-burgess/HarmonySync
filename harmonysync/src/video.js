import * as TauriEvent from '@tauri-apps/api/event';
import * as TauriCore from '@tauri-apps/api/core';

class VideoManager {
    constructor() {
        this.currentVideoPath = null;
        this.currentVideoDuration = 0;
    }

    async getVideoMetadata(videoPath) {
        console.log(`Getting metadata for video: ${videoPath}`);
        try {
            const metadata = await TauriCore.invoke('get_video_metadata', { path: videoPath });
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
            await TauriCore.invoke('stream_video_with_vlc', { videoPath: videoPath });
            console.log(`VLC launched to play video: ${videoPath}`);

            // No longer emitting display-video-slide as VLC handles display
            // We might want to emit an event to clear the audience screen or show a placeholder
            TauriEvent.emit('clear-lyric-display'); // Clear any existing content
            TauriEvent.emit('clear-confidence-display'); // Clear confidence monitor

        } catch (error) {
            console.error('Failed to launch VLC to play video:', error);
        }
    }

    async transcodeVideo(inputPath, outputPath) {
        console.log(`Transcoding video from ${inputPath} to ${outputPath}`);
        try {
            await TauriCore.invoke('transcode_video', { inputPath: inputPath, outputPath: outputPath });
            console.log('Video transcoding successful.');
            return true;
        } catch (error) {
            console.error('Video transcoding failed:', error);
            return false;
        }
    }

    async stopVideo() {
        console.log('Stopping video');
        this.currentVideoPath = null;
        this.currentVideoDuration = 0;
        try {
            await TauriCore.invoke('stop_vlc_stream');
            console.log('VLC stream stopped via Tauri command.');
        } catch (error) {
            console.error('Failed to stop VLC stream:', error);
        }
    }
}

export const videoManager = new VideoManager();
