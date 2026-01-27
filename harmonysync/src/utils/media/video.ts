import { core } from '../../electron-adapter';
import type { VideoMetadata } from '../../types/audio';

export async function getVideoMetadata(videoPath: string): Promise<VideoMetadata | null> {
	console.log(`Getting metadata for video: ${videoPath}`);
	try {
		const metadata = await core.invoke('get_video_metadata', { path: videoPath });
		return metadata as VideoMetadata;
	} catch (error) {
		console.error('Failed to get video metadata:', error);
		return null;
	}
}
