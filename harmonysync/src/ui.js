import * as Tauri from '@tauri-apps/api';
import { convertFileSrc } from '@tauri-apps/api/core';
import { setPan } from './audio.js';
import { videoManager } from './video.js';

export function createSlide(slide, index) {
    const slideDiv = document.createElement('div');
    slideDiv.classList.add('slide');
    slideDiv.dataset.slideIndex = index;
    slideDiv.dataset.originalIndex = index;
    slideDiv.dataset.slideType = slide.type || 'lyric'; // Add slide type to dataset
    slideDiv.draggable = true;

    slideDiv.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', slideDiv.dataset.slideIndex);
    });

    slideDiv.addEventListener('dragenter', () => {
        slideDiv.classList.add('drag-over');
    });

    slideDiv.addEventListener('dragleave', () => {
        slideDiv.classList.remove('drag-over');
    });

    slideDiv.addEventListener('drop', () => {
        slideDiv.classList.remove('drag-over');
    });

    if (slide.type === 'image') {
        const img = document.createElement('img');
        img.src = convertFileSrc(slide.path);
        img.alt = slide.name; // Use image name as alt text
        img.classList.add('slide-image'); // Add a class for styling
        slideDiv.appendChild(img);
        slideDiv.dataset.slidePath = slide.path; // Store path for next slide reconstruction
        slideDiv.dataset.slideName = slide.name; // Store name for next slide reconstruction
    } else if (slide.type === 'video') {
        const videoName = document.createElement('span');
        videoName.classList.add('slide-video-name');
        videoName.textContent = `Video: ${slide.name}`;
        slideDiv.appendChild(videoName);
        slideDiv.dataset.slidePath = slide.path; // Store path for next slide reconstruction
        slideDiv.dataset.slideName = slide.name; // Store name for next slide reconstruction
    } else if (slide.type === 'youtube') {
        const img = document.createElement('img');
        img.src = `https://img.youtube.com/vi/${slide.videoId}/0.jpg`;
        img.alt = `Youtube thumbnail for ${slide.name}`;
        img.classList.add('slide-image');
        slideDiv.appendChild(img);

        const youtubeName = document.createElement('span');
        youtubeName.classList.add('slide-youtube-name');
        youtubeName.textContent = `Youtube: ${slide.name}`;
        slideDiv.appendChild(youtubeName);
        slideDiv.dataset.slideVideoId = slide.videoId; // Store videoId for next slide reconstruction
        slideDiv.dataset.slideName = slide.name; // Store name for next slide reconstruction
    } else { // This is now specifically for lyrics slides
        const sectionLabel = document.createElement('span');
        sectionLabel.classList.add('slide-section-label');
        sectionLabel.textContent = `[${slide.section}]`;
        slideDiv.appendChild(sectionLabel);

        slide.text.forEach(line => {
            const p = document.createElement('p');
            p.textContent = line;
            slideDiv.appendChild(p);
        });
    }

    slideDiv.addEventListener('click', () => {
        document.querySelectorAll('.slide').forEach(s => s.classList.remove('selected'));
        slideDiv.classList.add('selected');

        // Emit the original event for the audience screen
        if (slide.type === 'image') {
            console.log('Emitting display-image-slide with payload:', { path: slide.path, name: slide.name });
            Tauri.event.emit('display-image-slide', { path: slide.path, name: slide.name });
        } else if (slide.type === 'video') {
            // Instead of emitting directly, call videoManager.playVideo
            // videoManager.playVideo will handle invoking Rust and emitting the event with stream URL
            videoManager.playVideo(slide.path, slide.duration);
        } else if (slide.type === 'youtube') {
            Tauri.event.emit('navigate', { videoId: slide.videoId });
        } else {
            console.log('Emitting display-lyric-slide with payload:', { text: slide.text, section: slide.section });
            Tauri.event.emit('display-lyric-slide', { text: slide.text, section: slide.section });
        }

        // Emit the new, more detailed event for the confidence monitor
        const allSlides = Array.from(document.querySelectorAll('.slide'));
        const currentSlideIndex = allSlides.findIndex(s => s.dataset.slideIndex === slideDiv.dataset.slideIndex);

        const nextSlideElement = allSlides[currentSlideIndex + 1];

        const payload = {
            current: slide,
            next: null
        };

        if (nextSlideElement) {
            const nextSlideType = nextSlideElement.dataset.slideType;
            if (nextSlideType === 'image') {
                payload.next = { type: 'image', path: nextSlideElement.dataset.slidePath, name: nextSlideElement.dataset.slideName };
            } else if (nextSlideType === 'video') {
                payload.next = { type: 'video', path: nextSlideElement.dataset.slidePath, name: nextSlideElement.dataset.slideName };
            } else if (nextSlideType === 'youtube') {
                payload.next = { type: 'youtube', videoId: nextSlideElement.dataset.slideVideoId, name: nextSlideElement.dataset.slideName };
            } else {
                const nextSection = nextSlideElement.querySelector('.slide-section-label').textContent.replace(/[\[\]]/g, '');
                const nextText = Array.from(nextSlideElement.querySelectorAll('p')).map(p => p.textContent);
                payload.next = { text: nextText, section: nextSection };
            }
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
