import * as Tauri from '@tauri-apps/api';
import { setPan } from './audio.js';

export function createSlide(slide, index) {
    const slideDiv = document.createElement('div');
    slideDiv.classList.add('slide');
    slideDiv.dataset.slideIndex = index;

    const sectionLabel = document.createElement('span');
    sectionLabel.classList.add('slide-section-label');
    sectionLabel.textContent = `[${slide.section}]`;
    slideDiv.appendChild(sectionLabel);

    slide.text.forEach(line => {
        const p = document.createElement('p');
        p.textContent = line;
        slideDiv.appendChild(p);
    });

    slideDiv.addEventListener('click', () => {
        // Emit the original event for the audience screen
        console.log('Emitting display-lyric-slide with payload:', { text: slide.text, section: slide.section });
        Tauri.event.emit('display-lyric-slide', { text: slide.text, section: slide.section });

        // Emit the new, more detailed event for the confidence monitor
        const allSlides = Array.from(document.querySelectorAll('.slide'));
        const currentSlideIndex = allSlides.findIndex(s => s.dataset.slideIndex === slideDiv.dataset.slideIndex);
        
        const nextSlideElement = allSlides[currentSlideIndex + 1];
        
        const payload = {
            current: slide,
            next: null
        };

        if (nextSlideElement) {
            // Reconstruct the next slide's data from its DOM element
            const nextSection = nextSlideElement.querySelector('.slide-section-label').textContent.replace(/[\[\]]/g, '');
            const nextText = Array.from(nextSlideElement.querySelectorAll('p')).map(p => p.textContent);
            payload.next = { text: nextText, section: nextSection };
        }
        console.log('Emitting display-confidence-slide with payload:', payload);
        Tauri.event.emit('display-confidence-slide', payload);
    });

    return slideDiv;
}

export function createTrackControl(track) {
    const trackDiv = document.createElement('div');
    trackDiv.classList.add('track');
    trackDiv.dataset.path = track.path;

    const trackNameSpan = document.createElement('span');
    trackNameSpan.textContent = track.name;
    trackDiv.appendChild(trackNameSpan);

    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = '0';
    volumeSlider.max = '1';
    volumeSlider.step = '0.01';
    volumeSlider.value = '0.7';
    volumeSlider.classList.add('volume-slider');
    volumeSlider.addEventListener('input', () => {
        track.gainNode.gain.value = track.isMuted ? 0 : parseFloat(volumeSlider.value);
    });
    trackDiv.appendChild(volumeSlider);

    const panControlsDiv = document.createElement('div');
    panControlsDiv.classList.add('pan-controls');

    const panLeftButton = document.createElement('button');
    panLeftButton.textContent = 'L';
    panLeftButton.classList.add('pan-button', 'pan-left');
    panControlsDiv.appendChild(panLeftButton);

    const panCenterButton = document.createElement('button');
    panCenterButton.textContent = 'C';
    panCenterButton.classList.add('pan-button', 'pan-center');
    panControlsDiv.appendChild(panCenterButton);

    const panRightButton = document.createElement('button');
    panRightButton.textContent = 'R';
    panRightButton.classList.add('pan-button', 'pan-right');
    panControlsDiv.appendChild(panRightButton);

    trackDiv.appendChild(panControlsDiv);

    const muteButton = document.createElement('button');
    muteButton.textContent = 'Mute';
    muteButton.classList.add('mute-button');
    trackDiv.appendChild(muteButton);

    panLeftButton.addEventListener('click', () => {
        setPan(track, -1);
        trackDiv.querySelectorAll('.pan-button').forEach(btn => btn.classList.remove('active-pan'));
        panLeftButton.classList.add('active-pan');
    });

    panCenterButton.addEventListener('click', () => {
        setPan(track, 0);
        trackDiv.querySelectorAll('.pan-button').forEach(btn => btn.classList.remove('active-pan'));
        panCenterButton.classList.add('active-pan');
    });

    panRightButton.addEventListener('click', () => {
        setPan(track, 1);
        trackDiv.querySelectorAll('.pan-button').forEach(btn => btn.classList.remove('active-pan'));
        panRightButton.classList.add('active-pan');
    });

    muteButton.addEventListener('click', () => {
        track.isMuted = !track.isMuted;
        if (track.isMuted) {
            muteButton.classList.add('active');
            track.gainNode.gain.value = 0;
        } else {
            muteButton.classList.remove('active');
            track.gainNode.gain.value = parseFloat(volumeSlider.value); // Restore volume
        }
    });

    return trackDiv;
}

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

        // Update UI for pan buttons
        const trackDiv = document.querySelector(`div.track[data-path="${track.path}"]`);
        if (trackDiv) {
            trackDiv.querySelectorAll('.pan-button').forEach(btn => btn.classList.remove('active-pan'));
            if (panValue === -1) {
                trackDiv.querySelector('.pan-left').classList.add('active-pan');
            } else if (panValue === 0) {
                trackDiv.querySelector('.pan-center').classList.add('active-pan');
            } else if (panValue === 1) {
                trackDiv.querySelector('.pan-right').classList.add('active-pan');
            }
        }
    });
}
