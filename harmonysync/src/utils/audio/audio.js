
import * as TauriFs from '@tauri-apps/plugin-fs';
import * as TauriCore from '@tauri-apps/api/core'; // Re-add TauriCore import

let audioContext = null;
let gainNode = null;
const audioSources = []; // To keep track of all active audio sources
const audioBufferCache = new Map(); // Cache for audio buffers

let tracks = []; // Array to hold track objects

export function getTracks() {
	return tracks;
}

export function clearTracks() {
	tracks = [];
}

export function addTracks(newTracks) {
	tracks.push(...newTracks);
}

export function clearAudioBufferCache() {
	audioBufferCache.clear();
}

function getAudioContext() {
	if (!audioContext || audioContext.state === 'closed') {
		audioContext = new (window.AudioContext || window.webkitAudioContext)();
		gainNode = audioContext.createGain(); // Re-create gainNode here
		gainNode.connect(audioContext.destination);
		console.log('AudioContext initialized.');
	}
	return audioContext;
}

function getGainNode() {
	// Ensure audio context and gain node are initialized
	getAudioContext();
	return gainNode;
}

export function stopAllAudio() {
	audioSources.forEach(source => {
		try {
			// source might be a BufferSource or a MediaElementSourceNode wrapper
			try { source.stop(); } catch (e) {}
			try { source.disconnect(); } catch (e) {}
		} catch (e) {
			console.warn("Error stopping or disconnecting audio source:", e);
		}
	});
	audioSources.length = 0; // Clear the array
}

export function cleanupAudio() {
	stopAllAudio(); // Stop all playing tracks and disconnect their sources
	if (audioContext && audioContext.state !== 'closed') {
		audioContext.close().then(() => {
			console.log("AudioContext closed successfully.");
			audioContext = null;
			gainNode = null; // Also nullify gainNode here
		}).catch((e) => {
			console.error("Error closing AudioContext:", e);
			audioContext = null;
			gainNode = null; // Also nullify gainNode on error
		});
	} else {
		audioContext = null; // Ensure it's null even if it was already closed or never initialized
		gainNode = null; // Also nullify gainNode
	}
	audioBufferCache.clear(); // Clear the audio buffer cache
}

export function setPan(track, panValue) {
	if (track && track.pannerNode) {
		track.pannerNode.pan.value = panValue;
		track.panValue = panValue;
	}
}

export async function loadAudioFile(path) {
	if (audioBufferCache.has(path)) {
		return audioBufferCache.get(path);
	}

	try {
		const audioContext = getAudioContext();
		const assetUrl = TauriCore.convertFileSrc(path); // Use convertFileSrc again
		console.log("Attempting to fetch assetUrl:", assetUrl); // Debugging line
		const response = await fetch(assetUrl);
		const arrayBuffer = await response.arrayBuffer();
		const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
		audioBufferCache.set(path, audioBuffer);
		return audioBuffer;
	} catch (error) {
		console.error(`Error loading or decoding audio file ${path}:`, error);
		return null;
	}
}

// Load a MOGG file and extract a specific channel as a mono buffer
export async function loadMoggChannel(path, channelIndex) {
	// Validate inputs
	if (typeof channelIndex !== 'number' || channelIndex < 0) {
		console.error(`Invalid channel index: ${channelIndex}`);
		return null;
	}

	const cacheKey = `${path}:${channelIndex}`;
	if (audioBufferCache.has(cacheKey)) {
		return audioBufferCache.get(cacheKey);
	}

	try {
		const audioContext = getAudioContext();
		const assetUrl = TauriCore.convertFileSrc(path);
		console.log(`Loading MOGG channel ${channelIndex} from:`, assetUrl);
		const response = await fetch(assetUrl);
    
		if (!response.ok) {
			throw new Error(`Failed to fetch MOGG file: ${response.statusText}`);
		}
    
		const arrayBuffer = await response.arrayBuffer();
		const multiChannelBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
		// Check if the requested channel exists
		if (channelIndex >= multiChannelBuffer.numberOfChannels) {
			console.error(`Channel ${channelIndex} does not exist in MOGG file (has ${multiChannelBuffer.numberOfChannels} channels)`);
			return null;
		}
    
		// Extract the specific channel into a new mono buffer
		const monoBuffer = audioContext.createBuffer(
			1, // mono
			multiChannelBuffer.length,
			multiChannelBuffer.sampleRate
		);
    
		const sourceData = multiChannelBuffer.getChannelData(channelIndex);
		const destData = monoBuffer.getChannelData(0);
		destData.set(sourceData);
    
		audioBufferCache.set(cacheKey, monoBuffer);
		return monoBuffer;
	} catch (error) {
		console.error(`Error loading or decoding MOGG channel ${channelIndex} from ${path}:`, error);
		return null;
	}
}

export function playAllTracks() {
	const currentAudioContext = getAudioContext();
	const currentTracks = getTracks();

	if (!currentAudioContext || currentTracks.length === 0) return;

	currentTracks.forEach(track => {
		if (!track.isPlaying) {
			if (track.buffer) {
				const source = currentAudioContext.createBufferSource();
				source.buffer = track.buffer;

				source.connect(track.pannerNode);
				track.pannerNode.connect(track.gainNode);
				track.gainNode.connect(getGainNode());

				source.start(0, track.offset);
				track.startTime = currentAudioContext.currentTime - track.offset;
				track.isPlaying = true;
				track.source = source;
				audioSources.push(source);

				source.onended = () => {
					track.isPlaying = false;
					track.offset = 0; // Reset offset when track ends
					const index = audioSources.indexOf(source);
					if (index > -1) {
						audioSources.splice(index, 1);
					}
				};
			} else if (track.audioEl) {
				// Create MediaElementAudioSourceNode and audio graph if not already created
				try {
					if (!track.source) {
						// Create audio nodes on first play
						track.source = currentAudioContext.createMediaElementSource(track.audioEl);
						track.gainNode = currentAudioContext.createGain();
						track.pannerNode = currentAudioContext.createStereoPanner();
						
						// Set initial gain value
						track.gainNode.gain.value = track.volume || 0.7;
						
						// Connect the audio graph: source -> panner -> gain -> destination
						track.source.connect(track.pannerNode);
						track.pannerNode.connect(track.gainNode);
						track.gainNode.connect(getGainNode());
					}
					
					// Set current time if offset exists
					try { track.audioEl.currentTime = track.offset || 0; } catch (e) {}
					
					// Play the audio element
					track.audioEl.play().catch(e => console.warn('Media element play failed:', e));
					track.isPlaying = true;
					
					// Only add to audioSources if not already there
					if (!audioSources.includes(track.source)) {
						audioSources.push(track.source);
					}
				} catch (e) {
					console.error('Error starting media element track:', e);
				}
			}
		}
	});
}

function goToBeginningAllTracks() {
	const currentAudioContext = getAudioContext();
	const currentTracks = getTracks();

	if (!currentAudioContext || currentTracks.length === 0) return;

	stopAllTracks();
	currentTracks.forEach(track => {
		track.offset = 0;
	});
}

export function applyDefaultPanning(currentTracks) {
	let hasClickOrGuide = false;
	currentTracks.forEach(track => {
		const lowerCaseName = track.name.toLowerCase();
		if (lowerCaseName.includes('click') || lowerCaseName.includes('guide')) {
			hasClickOrGuide = true;
		}
	});

	currentTracks.forEach(track => {
		const lowerCaseName = track.name.toLowerCase();
		let panValue = 0; // Default to center

		if (hasClickOrGuide) {
			if (lowerCaseName.includes('click') || lowerCaseName.includes('guide')) {
				panValue = -1; // Hard left
			} else {
				panValue = 1; // Hard right
			}
		} else {
			panValue = 0; // Center
		}
		setPan(track, panValue);
	});
}

let globalVolume = 1; // New variable to store global volume

function setGlobalVolume(volume) {
	globalVolume = volume;
	const currentTracks = getTracks();
	currentTracks.forEach(track => {
		if (track.gainNode) {
			// Apply global volume in addition to individual track volume (if any)
			// For simplicity, let's assume individual track volume is 0.7 if not muted
			track.gainNode.gain.value = track.isMuted ? 0 : globalVolume * (track.individualVolume || 0.7);
		}
	});
}

export {
		getAudioContext,
		goToBeginningAllTracks,
		setGlobalVolume // Export the new function
}

