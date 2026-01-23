# Remote Control API - HarmonySync Presenter

This document describes the Remote Control REST API for controlling HarmonySync Presenter from mobile devices.

## Overview

The Remote Control service provides a REST API that allows mobile devices (phones, tablets) to control the HarmonySync Presenter application over a local network. It includes:

- **REST API**: Full-featured REST API for controlling the application
- **Mobile Web Interface**: Responsive web interface optimized for touch devices
- **Real-time State Sync**: Automatic synchronization between the app and remote controls

## Getting Started

### Starting the Service

The Remote Control service starts automatically when HarmonySync launches. It runs on port **3000** by default.

### Accessing the Mobile Interface

1. **Find your IP address**: The service will display the network URL in the console when it starts
2. **Open on mobile device**: Navigate to `http://<your-ip-address>:3000/mobile-control.html`
3. **Start controlling**: The interface will automatically connect and display the current state

Example URLs:
- Local access: `http://localhost:3000/mobile-control.html`
- Network access: `http://192.168.1.100:3000/mobile-control.html`

### Setting the Setlist Directory

Before you can browse folders, set the setlist directory from the main application:

```javascript
// From the renderer process
await window.api.invoke('remote:setSetlistDirectory', '/path/to/setlist/folder');
```

## REST API Endpoints

### GET /api/status

Get the current application state.

**Response:**
```json
{
  "success": true,
  "data": {
    "currentFolder": "/path/to/song/folder",
    "currentSlideIndex": 2,
    "totalSlides": 10,
    "playbackStatus": "playing",
    "playbackPosition": 45.5,
    "loadedTracks": [
      { "name": "track1.ogg", "path": "/path/to/track1.ogg" }
    ]
  }
}
```

### GET /api/folders

List available song folders from the configured setlist directory.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Amazing Grace",
      "path": "/path/to/setlist/Amazing Grace",
      "hasAudio": true
    }
  ]
}
```

### POST /api/folder/select

Select and load a folder.

**Request Body:**
```json
{
  "folderPath": "/path/to/song/folder"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "folderPath": "/path/to/song/folder",
    "totalSlides": 10,
    "audioTracks": 4
  }
}
```

### POST /api/slide/next

Advance to the next slide.

**Response:**
```json
{
  "success": true,
  "data": {
    "currentSlideIndex": 3,
    "totalSlides": 10
  }
}
```

### POST /api/slide/previous

Go to the previous slide.

**Response:**
```json
{
  "success": true,
  "data": {
    "currentSlideIndex": 1,
    "totalSlides": 10
  }
}
```

### POST /api/playback/play

Start or resume multitrack audio playback.

**Response:**
```json
{
  "success": true,
  "data": {
    "playbackStatus": "playing"
  }
}
```

### POST /api/playback/pause

Pause multitrack audio playback.

**Response:**
```json
{
  "success": true,
  "data": {
    "playbackStatus": "paused"
  }
}
```

### POST /api/playback/stop

Stop multitrack audio playback.

**Response:**
```json
{
  "success": true,
  "data": {
    "playbackStatus": "stopped"
  }
}
```

### GET /api/playback/status

Get current playback status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "playing",
    "position": 45.5,
    "tracksLoaded": 4
  }
}
```

## IPC Handlers (Electron Main Process)

### remote:getUrl

Get the remote control service URLs.

```javascript
const urls = await ipcMain.handle('remote:getUrl');
// Returns: { local: "http://localhost:3000", network: "http://192.168.1.100:3000", mobile: "..." }
```

### remote:getState

Get the current remote control state.

```javascript
const state = await ipcMain.handle('remote:getState');
```

### remote:updateState

Update the remote control state (for synchronization).

```javascript
await ipcMain.handle('remote:updateState', {
  currentSlideIndex: 5,
  playbackStatus: 'playing'
});
```

### remote:setSetlistDirectory

Set the directory to scan for song folders.

```javascript
await ipcMain.handle('remote:setSetlistDirectory', '/path/to/setlist');
```

## State Synchronization

The remote control service automatically syncs with the main application through IPC events:

### From Main App to Remote Control

Send these events from your renderer process to keep remote controls updated:

```javascript
// When a folder is loaded
ipcRenderer.send('app:folder-loaded', {
  folderPath: '/path/to/folder',
  totalSlides: 10,
  audioTracks: ['/path/to/track1.ogg', '/path/to/track2.ogg']
});

// When slide changes
ipcRenderer.send('app:slide-changed', {
  slideIndex: 3
});

// When playback state changes
ipcRenderer.send('app:playback-changed', {
  status: 'playing', // or 'paused', 'stopped'
  position: 45.5
});
```

### From Remote Control to Main App

The main window receives these events when actions are triggered from remote controls:

```javascript
// Listen for remote control events in renderer
ipcRenderer.on('remote:folder-selected', (event, data) => {
  // data: { folderPath, slides, audioTracks }
});

ipcRenderer.on('remote:slide-next', (event, data) => {
  // data: { slideIndex }
});

ipcRenderer.on('remote:slide-previous', (event, data) => {
  // data: { slideIndex }
});

ipcRenderer.on('remote:playback-play', () => {
  // Start playback
});

ipcRenderer.on('remote:playback-pause', () => {
  // Pause playback
});

ipcRenderer.on('remote:playback-stop', () => {
  // Stop playback
});
```

## Mobile Interface Features

The mobile web interface (`mobile-control.html`) provides:

- **Touch-optimized controls**: Large, easy-to-tap buttons
- **Real-time status**: Auto-refreshing status display
- **Connection indicator**: Visual feedback of connection status
- **Folder browser**: Browse and select song folders
- **Slide navigation**: Previous/Next slide buttons
- **Playback control**: Play, Pause, Stop buttons
- **Responsive design**: Works on phones and tablets
- **Dark theme**: Easy on the eyes in dim environments

## Network Configuration

### Firewall Settings

Ensure port **3000** is open on your firewall:

**Windows:**
```powershell
New-NetFirewallRule -DisplayName "HarmonySync Remote" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

**Linux:**
```bash
sudo ufw allow 3000/tcp
```

**macOS:**
System Preferences → Security & Privacy → Firewall → Firewall Options → Add Application

### Finding Your IP Address

**Windows:**
```cmd
ipconfig
```

**Linux/macOS:**
```bash
ifconfig
# or
ip addr show
```

Look for the `inet` address on your active network interface (usually starts with 192.168.x.x or 10.0.x.x).

## Security Considerations

⚠️ **Important Security Notes:**

1. **Authentication**: The remote control API has **no authentication** by default - this is intentional for simplicity in trusted environments
2. **Network Usage**: Only use on trusted networks (e.g., home/church network)
3. **Network Binding**: The service binds to `0.0.0.0` (all interfaces) for network access
4. **Public Internet**: Do not expose this service to the public internet
5. **VPN Access**: Consider using a VPN if remote access over the internet is needed
6. **Rate Limiting**: Built-in rate limiting (100 requests per minute per IP) protects against basic abuse

### Rate Limiting

The API includes built-in rate limiting to prevent abuse:
- **Limit**: 100 requests per minute per IP address
- **Window**: 1 minute rolling window
- **Response**: Returns HTTP 429 (Too Many Requests) when limit exceeded

This is sufficient for normal use but provides basic protection against accidental loops or malicious activity.

## Troubleshooting

### Cannot Connect from Mobile Device

1. **Check same network**: Ensure mobile device is on the same Wi-Fi network
2. **Check firewall**: Verify port 3000 is allowed
3. **Check IP address**: Verify you're using the correct IP address
4. **Check service**: Verify the service started (check console logs)

### Folders Not Showing

1. **Set directory**: Ensure setlist directory is configured
2. **Check path**: Verify the directory path is correct and accessible
3. **Check permissions**: Ensure the app has read access to the directory

### Controls Not Working

1. **Check state sync**: Ensure state synchronization events are being sent
2. **Check console**: Look for errors in browser console (F12)
3. **Refresh page**: Try refreshing the mobile interface
4. **Check logs**: Review console logs in the main application

## Development

### Running in Development

The remote control service starts automatically in development mode. The console will show:

```
[RemoteControl] Server listening on:
  - Local:   http://localhost:3000
  - Network: http://192.168.1.100:3000
[RemoteControl] Mobile interface: http://192.168.1.100:3000/mobile-control.html
```

### Testing the API

Use curl or Postman to test the API:

```bash
# Get status
curl http://localhost:3000/api/status

# Get folders
curl http://localhost:3000/api/folders

# Select folder
curl -X POST http://localhost:3000/api/folder/select \
  -H "Content-Type: application/json" \
  -d '{"folderPath": "/path/to/folder"}'

# Next slide
curl -X POST http://localhost:3000/api/slide/next

# Play audio
curl -X POST http://localhost:3000/api/playback/play
```

### Customizing the Mobile Interface

The mobile interface files are located in `electron/public/`:

- `mobile-control.html` - HTML structure
- `mobile-control.css` - Styling
- `mobile-control.js` - JavaScript functionality

Feel free to customize these files to match your workflow and preferences.

## Integration Example

Here's a complete example of integrating the remote control in your renderer process:

```javascript
// Initialize remote control
async function initRemoteControl() {
  // Set the setlist directory
  await window.api.invoke('remote:setSetlistDirectory', '/path/to/setlist');
  
  // Get the remote control URL
  const urls = await window.api.invoke('remote:getUrl');
  console.log('Remote control available at:', urls.mobile);
  
  // Listen for remote control events
  window.api.on('remote:folder-selected', handleRemoteFolderSelected);
  window.api.on('remote:slide-next', handleRemoteNextSlide);
  window.api.on('remote:slide-previous', handleRemotePrevSlide);
  window.api.on('remote:playback-play', handleRemotePlay);
  window.api.on('remote:playback-pause', handleRemotePause);
  window.api.on('remote:playback-stop', handleRemoteStop);
}

// Sync state when local changes occur
function syncRemoteState() {
  // When you load a folder
  window.api.send('app:folder-loaded', {
    folderPath: currentFolder,
    totalSlides: slides.length,
    audioTracks: audioFiles
  });
  
  // When slide changes
  window.api.send('app:slide-changed', {
    slideIndex: currentSlideIndex
  });
  
  // When playback changes
  window.api.send('app:playback-changed', {
    status: isPlaying ? 'playing' : 'stopped',
    position: audioPosition
  });
}
```

## Future Enhancements

Potential features for future versions:

- WebSocket support for real-time bidirectional communication
- Authentication and authorization
- Multiple presenter control (permissions/roles)
- Slide thumbnails in mobile interface
- Volume/mixer controls
- Custom button configurations
- Keyboard shortcuts via mobile interface
- Presentation notes display

## License

This feature is part of HarmonySync Presenter and follows the same license terms.
