# Mobile Device Control - User Guide

## Overview

HarmonySync Presenter now includes a **Mobile Device Control** feature that allows you to remotely control the application from any smartphone or tablet on the same network. This is perfect for:

- **Worship leaders** who want to control slides from the stage
- **Technical directors** who need to manage presentations from anywhere in the venue
- **Multi-person teams** where one person runs the main app while another controls slides/audio
- **Remote control scenarios** where you need to be away from the main computer

## Features

✅ **Folder Selection** - Browse and load song folders from your setlist  
✅ **Slide Navigation** - Large, touch-friendly Previous/Next buttons  
✅ **Playback Control** - Start, pause, and stop multitrack audio playback  
✅ **Real-time Status** - See current folder, slide, and playback status  
✅ **Responsive Design** - Works on phones and tablets in portrait or landscape  
✅ **Dark Theme** - Easy on eyes in dim worship environments  

## Quick Start

### 1. Start HarmonySync Presenter

Launch the HarmonySync Presenter application on your main computer.

### 2. Find the Mobile Control URL

When the app starts, the console will display the mobile control URL:

```
[RemoteControl] Server listening on:
  - Local:   http://localhost:3000
  - Network: http://192.168.1.100:3000
[RemoteControl] Mobile interface: http://192.168.1.100:3000/mobile-control.html
```

**Important:** Both devices (computer and mobile) must be on the **same Wi-Fi network**.

### 3. Open the URL on Your Mobile Device

On your smartphone or tablet:

1. Open your web browser (Safari, Chrome, Firefox, etc.)
2. Enter the **Network URL** shown in the console
3. Navigate to: `http://[IP-ADDRESS]:3000/mobile-control.html`
4. Bookmark the page for easy access

### 4. Set the Setlist Directory (Optional)

If you want to browse folders from the mobile interface, you need to set a setlist directory from the main app:

```javascript
// In the main app renderer process
await window.api.invoke('remote:setSetlistDirectory', '/path/to/your/setlist');
```

This allows the mobile interface to list and load song folders.

## Using the Mobile Interface

### Connection Status

At the top of the screen, you'll see a connection indicator:

- 🟢 **Green** = Connected to the app
- 🔴 **Red** = Disconnected or error
- 🟡 **Yellow** = Connecting...

### Current Status Card

Displays real-time information:

- **Folder:** Name of the currently loaded folder
- **Slide:** Current slide number and total slides
- **Playback:** Current playback status (Playing, Paused, Stopped)
- **Tracks:** Number of audio tracks loaded

### Folder Selection

1. Tap **🔄 Refresh** to load the list of available folders
2. Select a folder from the dropdown
3. Tap **✓ Load Folder** to load it in the main app

### Slide Navigation

Two large buttons for easy control:

- **⬅️ Previous** - Go to previous slide
- **➡️ Next** - Go to next slide

### Playback Controls

Three buttons to control audio:

- **▶️ Play** - Start/resume playback
- **⏸️ Pause** - Pause playback
- **⏹️ Stop** - Stop playback

### Toast Notifications

After each action, you'll see a brief notification at the bottom of the screen confirming the action was successful or showing any errors.

## Troubleshooting

### "Cannot connect to server"

**Solution:**
- Ensure both devices are on the **same Wi-Fi network**
- Check that the HarmonySync app is running
- Verify the IP address in the URL matches the one shown in the console
- Check your firewall allows connections on port 3000

### "Folders list is empty"

**Solution:**
- Make sure you've set the setlist directory in the main app
- Verify the directory contains subfolders with songs/presentations

### Buttons don't respond

**Solution:**
- Check the connection status indicator at the top
- Refresh the page in your mobile browser
- Verify the main app is running and responsive

### Wrong IP address shown

**Solution:**
- If you have multiple network adapters, the app might detect the wrong one
- Use the local IP address of your computer (check in Settings → Network)
- Manually enter: `http://[YOUR-IP]:3000/mobile-control.html`

## Security Considerations

### Rate Limiting

The remote control API includes rate limiting:
- **100 requests per minute per IP address**
- Prevents abuse and excessive API calls
- Should be sufficient for normal use

### Network Security

⚠️ **Important Security Notes:**

1. **No Authentication:** The mobile control interface does NOT require a password
2. **Local Network Only:** Designed for trusted local networks (home, church)
3. **Firewall:** Your firewall may block port 3000 by default
4. **Public Networks:** Avoid using on public Wi-Fi where others could access the interface

### Recommended Setup

For best security:

1. Use a **private Wi-Fi network** (not guest networks)
2. Use **WPA2/WPA3 encryption** on your Wi-Fi
3. Keep the network **password-protected**
4. Only share the URL with **trusted team members**

## Advanced Features

### State Synchronization

The mobile interface automatically syncs with the main app:

- **Main app → Mobile:** When you navigate slides in the main app, the mobile interface updates automatically
- **Mobile → Main app:** Actions taken on mobile are immediately reflected in the main app

### Multiple Mobile Devices

You can connect **multiple mobile devices** simultaneously:

- All devices will see the same current state
- All devices can control the app
- Changes from any device are reflected on all others

### Refresh Rate

The mobile interface polls the server every **2 seconds** for status updates. This keeps the display current without overwhelming the server.

## Integration with Main App

For developers integrating the remote control with the renderer process:

### Syncing State to Remote Control

```javascript
// When a folder is loaded
await window.api.invoke('remote:updateState', {
  currentFolder: '/path/to/folder',
  totalSlides: slides.length,
  currentSlideIndex: 0,
  loadedTracks: trackPaths
});

// When slides change
await window.api.invoke('remote:updateState', {
  currentSlideIndex: newIndex
});

// When playback changes
await window.api.invoke('remote:updateState', {
  playbackStatus: 'playing' // or 'paused', 'stopped'
});
```

### Receiving Actions from Remote Control

```javascript
// Listen for next slide requests
window.api.on('remote:slide-next', () => {
  // Advance to next slide
  advanceToNextSlide();
});

// Listen for previous slide requests
window.api.on('remote:slide-previous', () => {
  // Go to previous slide
  goToPreviousSlide();
});

// Listen for playback control
window.api.on('remote:playback-play', () => {
  // Start playback
  playAudio();
});

window.api.on('remote:playback-pause', () => {
  // Pause playback
  pauseAudio();
});

window.api.on('remote:playback-stop', () => {
  // Stop playback
  stopAudio();
});

// Listen for folder loading
window.api.on('remote:folder-loaded', (folderPath) => {
  // Load the folder
  loadFolder(folderPath);
});
```

See `REMOTE_CONTROL_INTEGRATION_EXAMPLE.md` for complete integration code examples.

## Tips & Best Practices

### For Worship Leaders

1. **Practice First:** Test the mobile control during rehearsal, not for the first time during service
2. **Bookmark the Page:** Save the URL to your home screen for quick access
3. **Check Connection:** Always verify the connection status before starting
4. **Have a Backup:** Keep the main computer accessible in case of issues

### For Technical Directors

1. **Set Up Before Service:** Configure folders and test connections ahead of time
2. **Use Airplane Mode:** On your mobile device, use airplane mode + Wi-Fi to prevent interruptions
3. **Increase Brightness:** In dim venues, increase screen brightness for visibility
4. **Multiple Devices:** Have a backup mobile device with the page loaded

### For Multi-Person Teams

1. **Assign Roles:** Clearly define who controls slides vs. audio
2. **Communication:** Use visual cues or earpieces for coordination
3. **Pre-Service Check:** Both team members should verify they can control the app
4. **Emergency Protocol:** Establish a backup plan if remote control fails

## Frequently Asked Questions

### Can I use this over the internet?

**No.** The remote control is designed for local network use only. You cannot access it from outside your network without additional configuration (port forwarding, VPN), which is not recommended for security reasons.

### Does it work on iOS and Android?

**Yes!** The mobile interface is a web page that works in any modern mobile browser:
- iOS: Safari, Chrome, Firefox
- Android: Chrome, Firefox, Samsung Internet
- Works on both phones and tablets

### Can I customize the interface?

**Yes!** The mobile interface files are located at:
- `electron/public/mobile-control.html` - Structure
- `electron/public/mobile-control.css` - Styling
- `electron/public/mobile-control.js` - Functionality

Feel free to modify these files to match your preferences or branding.

### Will it drain my phone battery?

The interface uses minimal battery:
- Updates every 2 seconds (not continuous)
- No video streaming
- Simple, lightweight UI
- Typical usage: negligible battery drain

### Can I add more controls?

**Yes!** The REST API supports extending functionality. See `REMOTE_CONTROL_API.md` for the complete API reference and how to add custom endpoints.

## Support

For issues, questions, or feature requests:

1. Check the troubleshooting section above
2. Review the API documentation: `REMOTE_CONTROL_API.md`
3. Check the integration guide: `REMOTE_CONTROL_INTEGRATION_EXAMPLE.md`
4. Open an issue on GitHub

---

**Enjoy controlling HarmonySync Presenter from anywhere in your venue!** 🎵📱✨
