import * as TauriCore from '@tauri-apps/api/core';

export async function getVideoMetadata(videoPath) {
    console.log(`Getting metadata for video: ${videoPath}`);
    try {
        const metadata = await TauriCore.invoke('get_video_metadata', { path: videoPath });
        return metadata;
    } catch (error) {
        console.error('Failed to get video metadata:', error);
        return null;
    }
}