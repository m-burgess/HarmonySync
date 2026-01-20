
import { core } from '../electron-adapter';

export async function getVideoMetadata(videoPath) {
	console.log(`Getting metadata for video: ${videoPath}`);
	try {
		const metadata = await core.invoke('get_video_metadata', { path: videoPath });
		return metadata;
	} catch (error) {
		console.error('Failed to get video metadata:', error);
		return null;
	}
}

