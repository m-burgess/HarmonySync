import * as Tauri from '@tauri-apps/api';
import { convertFileSrc } from '@tauri-apps/api/core';

Tauri.event.listen('set-background', (event) => {
  console.log('Audience: set-background event received:', event.payload);
  const head = document.getElementsByTagName('head')[0];
  const oldStyle = document.getElementById('song-background-style');
  if (oldStyle) {
    head.removeChild(oldStyle);
  }

  const style = document.createElement('style');
  style.id = 'song-background-style';
  style.textContent = event.payload;
  head.appendChild(style);
});

Tauri.event.listen('display-lyric-slide', (event) => {
  console.log('Audience: display-lyric-slide event received:', event.payload);
  const lyricDisplay = document.getElementById('lyric-display');
  if (lyricDisplay) {
    lyricDisplay.innerHTML = ''; // Clear any previous content (image or lyrics)
    lyricDisplay.innerHTML = event.payload.text.join('<br>'); // Join lines with <br>
  }
});

Tauri.event.listen('display-image-slide', (event) => {
  console.log('Audience: display-image-slide event received:', event.payload);
  const lyricDisplay = document.getElementById('lyric-display');
  if (lyricDisplay) {
    lyricDisplay.innerHTML = ''; // Clear any previous content (image or lyrics)
    const img = document.createElement('img');
    img.src = convertFileSrc(event.payload.path);
    img.alt = event.payload.name;
    img.classList.add('audience-slide-image'); // Add a class for styling
    lyricDisplay.appendChild(img);
  }
});

Tauri.event.listen('clear-lyric-display', () => {
  console.log('Audience: clear-lyric-display event received');
  const lyricDisplay = document.getElementById('lyric-display');
  if (lyricDisplay) {
    lyricDisplay.innerHTML = '';
  }
});

Tauri.event.listen('navigate', (event) => {
    console.log('Audience: navigate event received:', event.payload);
    const lyricDisplay = document.getElementById('lyric-display');
    if (lyricDisplay) {
        lyricDisplay.innerHTML = ''; // Clear any previous content
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${event.payload.videoId}?autoplay=1`;
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        lyricDisplay.appendChild(iframe);
    }
});
