import * as Tauri from '@tauri-apps/api';

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
    lyricDisplay.innerHTML = event.payload.text.join('<br>'); // Join lines with <br>
  }
});
