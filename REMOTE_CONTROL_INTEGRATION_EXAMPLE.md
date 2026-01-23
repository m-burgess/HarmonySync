# Remote Control Integration Example

This file provides example code for integrating the remote control service in your renderer process.

## Renderer Process Integration

Add this code to your main renderer process (e.g., in your main Vue/React component or main.js):

```javascript
// ==================== Initialization ====================

async function initializeRemoteControl() {
  try {
    // Set the setlist directory (adjust path as needed)
    const setlistPath = '/path/to/your/setlist/directory';
    await window.api.invoke('remote:setSetlistDirectory', setlistPath);
    
    // Get the remote control URLs
    const urls = await window.api.invoke('remote:getUrl');
    console.log('🎵 Remote Control URLs:');
    console.log('  Local:   ', urls.local);
    console.log('  Network: ', urls.network);
    console.log('  Mobile:  ', urls.mobile);
    
    // Optionally display in UI
    displayRemoteControlInfo(urls);
    
    // Setup event listeners
    setupRemoteControlListeners();
    
    console.log('✅ Remote control initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize remote control:', error);
  }
}

// ==================== Event Listeners ====================

function setupRemoteControlListeners() {
  // Listen for folder selection from remote
  window.api.on('remote:folder-selected', (data) => {
    console.log('📁 Remote: Folder selected', data.folderPath);
    loadFolder(data.folderPath);
  });
  
  // Listen for slide navigation from remote
  window.api.on('remote:slide-next', (data) => {
    console.log('➡️ Remote: Next slide', data.slideIndex);
    goToSlide(data.slideIndex);
  });
  
  window.api.on('remote:slide-previous', (data) => {
    console.log('⬅️ Remote: Previous slide', data.slideIndex);
    goToSlide(data.slideIndex);
  });
  
  // Listen for playback control from remote
  window.api.on('remote:playback-play', () => {
    console.log('▶️ Remote: Play');
    startPlayback();
  });
  
  window.api.on('remote:playback-pause', () => {
    console.log('⏸️ Remote: Pause');
    pausePlayback();
  });
  
  window.api.on('remote:playback-stop', () => {
    console.log('⏹️ Remote: Stop');
    stopPlayback();
  });
}

// ==================== State Synchronization ====================

// Call this when you load a folder in your app
function onFolderLoaded(folderPath, slides, audioTracks) {
  // Sync state to remote control
  window.api.send('app:folder-loaded', {
    folderPath: folderPath,
    totalSlides: slides.length,
    audioTracks: audioTracks
  });
  
  console.log('📤 Synced folder state to remote control');
}

// Call this when the slide changes in your app
function onSlideChanged(newSlideIndex) {
  // Sync state to remote control
  window.api.send('app:slide-changed', {
    slideIndex: newSlideIndex
  });
  
  console.log('📤 Synced slide state to remote control');
}

// Call this when playback state changes in your app
function onPlaybackStateChanged(status, position = 0) {
  // Sync state to remote control
  window.api.send('app:playback-changed', {
    status: status, // 'playing', 'paused', or 'stopped'
    position: position
  });
  
  console.log('📤 Synced playback state to remote control');
}

// ==================== Application Functions ====================
// Implement these based on your application logic

function loadFolder(folderPath) {
  // Your folder loading logic here
  console.log('Loading folder:', folderPath);
  
  // Example:
  // 1. Load slides from folder
  // 2. Load audio tracks
  // 3. Update UI
  // 4. Sync state
  
  // After loading, sync state
  // onFolderLoaded(folderPath, slides, audioTracks);
}

function goToSlide(slideIndex) {
  // Your slide navigation logic here
  console.log('Going to slide:', slideIndex);
  
  // Example:
  // 1. Update current slide index
  // 2. Display the slide
  // 3. Update UI
  // 4. Sync state
  
  // After changing, sync state
  // onSlideChanged(slideIndex);
}

function startPlayback() {
  // Your playback start logic here
  console.log('Starting playback');
  
  // Example:
  // 1. Start audio playback
  // 2. Update UI
  // 3. Sync state
  
  // After starting, sync state
  // onPlaybackStateChanged('playing');
}

function pausePlayback() {
  // Your playback pause logic here
  console.log('Pausing playback');
  
  // After pausing, sync state
  // onPlaybackStateChanged('paused', currentPosition);
}

function stopPlayback() {
  // Your playback stop logic here
  console.log('Stopping playback');
  
  // After stopping, sync state
  // onPlaybackStateChanged('stopped', 0);
}

// ==================== UI Display (Optional) ====================

function displayRemoteControlInfo(urls) {
  // Example: Display remote control URL in UI
  // You can show this in a settings panel or notification
  
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(urls.mobile)}`;
  
  // Show modal/notification with QR code and URL
  console.log('📱 Display QR code:', qrCodeUrl);
  console.log('📱 Mobile URL:', urls.mobile);
  
  // Example HTML:
  /*
  <div class="remote-control-info">
    <h3>Remote Control</h3>
    <p>Scan this QR code with your mobile device:</p>
    <img src="${qrCodeUrl}" alt="QR Code" />
    <p>Or visit: <a href="${urls.mobile}">${urls.mobile}</a></p>
  </div>
  */
}

// ==================== Initialize on App Load ====================

// Call this when your app is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeRemoteControl();
});

// Or if using a framework like Vue:
/*
export default {
  mounted() {
    initializeRemoteControl();
  }
}
*/

// Or if using React:
/*
useEffect(() => {
  initializeRemoteControl();
}, []);
*/
```

## Preload Script

Make sure your `preload.js` exposes the necessary IPC methods:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Invoke methods (async)
  invoke: (channel, ...args) => {
    return ipcRenderer.invoke(channel, ...args);
  },
  
  // Send methods (one-way)
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  
  // Listen to events from main process
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  },
  
  // Remove listeners
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});
```

## Complete Example Flow

Here's a complete example of loading a folder and syncing state:

```javascript
async function loadSongFolder(folderPath) {
  try {
    // 1. Read folder contents
    const files = await window.api.invoke('fs:readDir', folderPath);
    
    // 2. Separate slides and audio files
    const slides = files.filter(f => 
      f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
    ).sort();
    
    const audioTracks = files.filter(f => 
      f.endsWith('.ogg') || f.endsWith('.mp3') || f.endsWith('.wav')
    ).map(f => path.join(folderPath, f));
    
    // 3. Update local state
    this.currentFolder = folderPath;
    this.slides = slides;
    this.audioTracks = audioTracks;
    this.currentSlideIndex = 0;
    
    // 4. Display first slide
    await this.displaySlide(0);
    
    // 5. Sync with remote control
    window.api.send('app:folder-loaded', {
      folderPath: folderPath,
      totalSlides: slides.length,
      audioTracks: audioTracks
    });
    
    console.log('✅ Folder loaded and synced:', folderPath);
  } catch (error) {
    console.error('❌ Failed to load folder:', error);
  }
}
```

## Testing

Test the integration by:

1. Start the app and check console for remote control URLs
2. Open the mobile URL on a phone/tablet
3. Select a folder from mobile - verify it loads in main app
4. Navigate slides from mobile - verify slides change in main app
5. Control playback from mobile - verify audio starts/stops
6. Make changes in main app - verify state updates in mobile interface

## Troubleshooting

### Events not firing
- Check that `setupRemoteControlListeners()` is called
- Verify preload script exposes the `on` method
- Check browser console for errors

### State not syncing
- Verify you're calling the `app:*` send methods
- Check that the remote control service is running
- Look for errors in main process console

### Remote control not accessible
- Verify firewall allows port 3000
- Check that devices are on same network
- Try local URL first (`http://localhost:3000`)

## Best Practices

1. **Initialize early**: Call `initializeRemoteControl()` during app startup
2. **Sync consistently**: Always sync state after local changes
3. **Handle errors**: Wrap remote control calls in try-catch
4. **Test on real devices**: Test on actual mobile devices, not just browser
5. **Consider offline mode**: Handle cases where remote control fails gracefully
6. **Log everything**: Use console.log to track remote control events during development
