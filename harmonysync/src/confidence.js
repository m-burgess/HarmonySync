import * as Tauri from '@tauri-apps/api';
import { convertFileSrc } from '@tauri-apps/api/core';

// Clock functionality
function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = String(hours % 12 || 12);
    const clockDisplay = document.getElementById('clock-display');
    if (clockDisplay) {
        clockDisplay.textContent = `${displayHours}:${minutes} ${ampm}`;
    }
}

// Update clock every second
setInterval(updateClock, 1000);
// Initial call to display clock immediately
updateClock();

Tauri.event.listen('display-confidence-slide', (event) => {
    console.log('Confidence: display-confidence-slide event received:', event.payload);
    const { current, next } = event.payload;

    const currentSlideDisplay = document.getElementById('current-slide-display');
    const nextSlideDisplay = document.getElementById('next-slide-display');
    const confidenceImageDisplay = document.getElementById('confidence-image-display');
    const textColumnsWrapper = document.querySelector('.text-columns-wrapper');
    const clockDisplay = document.getElementById('clock-display');

    // Clear previous image if any
    if (confidenceImageDisplay) {
        confidenceImageDisplay.innerHTML = '';
    }

    if (current && current.type === 'image') {
        if (confidenceImageDisplay) {
            const img = document.createElement('img');
            img.src = convertFileSrc(current.path);
            img.alt = current.name;
            img.classList.add('confidence-slide-image'); // Add a class for styling
            confidenceImageDisplay.appendChild(img);
            confidenceImageDisplay.style.display = 'flex';
        }
        if (textColumnsWrapper) textColumnsWrapper.style.display = 'none';
        if (clockDisplay) clockDisplay.style.display = 'block'; // Ensure clock is visible with image

        // Clear text displays if an image is shown
        if (currentSlideDisplay) currentSlideDisplay.innerHTML = '';
        if (nextSlideDisplay) nextSlideDisplay.innerHTML = '';
    } else {
        if (confidenceImageDisplay) confidenceImageDisplay.style.display = 'none';
        if (textColumnsWrapper) textColumnsWrapper.style.display = 'flex';
        if (clockDisplay) clockDisplay.style.display = 'block'; // Assuming clock is block-level

        if (currentSlideDisplay) {
            currentSlideDisplay.innerHTML = current && current.text ? current.text.join('<br>') : '';
        }

        if (nextSlideDisplay) {
            nextSlideDisplay.innerHTML = next && next.text ? next.text.join('<br>') : '';
        }
    }
});

Tauri.event.listen('clear-confidence-display', () => {
    console.log('Confidence: clear-confidence-display event received');
    const currentSlideDisplay = document.getElementById('current-slide-display');
    const nextSlideDisplay = document.getElementById('next-slide-display');
    const confidenceImageDisplay = document.getElementById('confidence-image-display');
    const textColumnsWrapper = document.querySelector('.text-columns-wrapper');
    const clockDisplay = document.getElementById('clock-display');

    if (currentSlideDisplay) {
        currentSlideDisplay.innerHTML = '';
    }
    if (nextSlideDisplay) {
        nextSlideDisplay.innerHTML = '';
    }
    if (confidenceImageDisplay) {
        confidenceImageDisplay.innerHTML = '';
        confidenceImageDisplay.style.display = 'none';
    }
    if (textColumnsWrapper) textColumnsWrapper.style.display = 'none';
    if (clockDisplay) clockDisplay.style.display = 'none';
});
