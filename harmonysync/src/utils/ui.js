import { setPan } from './audio.js';


export function applyDefaultPanning(tracks) {
    let hasClickOrGuide = false;
    tracks.forEach(track => {
        const lowerCaseName = track.name.toLowerCase();
        if (lowerCaseName.includes('click') || lowerCaseName.includes('guide')) {
            hasClickOrGuide = true;
        }
    });

    tracks.forEach(track => {
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
        track.panValue = panValue; // Update the track object's panValue
    });
}
