import * as Tauri from '@tauri-apps/api';

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

    if (currentSlideDisplay) {
        currentSlideDisplay.innerHTML = current && current.text ? current.text.join('<br>') : '';
    }

    if (nextSlideDisplay) {
        nextSlideDisplay.innerHTML = next && next.text ? next.text.join('<br>') : '';
    }
});

Tauri.event.listen('clear-confidence-display', () => {
    console.log('Confidence: clear-confidence-display event received');
    const currentSlideDisplay = document.getElementById('current-slide-display');
    const nextSlideDisplay = document.getElementById('next-slide-display');
    if (currentSlideDisplay) {
        currentSlideDisplay.innerHTML = '';
    }
    if (nextSlideDisplay) {
        nextSlideDisplay.innerHTML = '';
    }
});
