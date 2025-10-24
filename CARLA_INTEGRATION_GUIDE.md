# Carla Plugin Manager Integration Guide

## How to Add Plugin Manager Button to Main App

To integrate the Carla Plugin Manager into your HarmonySync main application, follow these steps:

### 1. Add a Button to Open Plugin Manager

In your main app component (e.g., `src/App.jsx`), add a button to open the plugin manager:

```jsx
import { invoke } from '@tauri-apps/api/core';

function App() {
  const handleOpenPluginManager = async () => {
    try {
      await invoke('open_plugin_manager_window');
    } catch (error) {
      console.error('Failed to open plugin manager:', error);
    }
  };

  return (
    <div className="app">
      {/* Your existing UI */}
      
      <button onClick={handleOpenPluginManager} className="plugin-manager-btn">
        🎹 Open Plugin Manager
      </button>
      
      {/* Rest of your UI */}
    </div>
  );
}
```

### 2. Add to Activity Bar (Sidebar)

If you have a sidebar or activity bar, add an icon/button there:

```jsx
<div className="activity-bar">
  {/* Existing buttons */}
  
  <button 
    onClick={handleOpenPluginManager}
    className="activity-bar-item"
    title="Plugin Manager"
  >
    <svg width="24" height="24" viewBox="0 0 24 24">
      {/* Plugin icon SVG */}
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
    <span>Plugins</span>
  </button>
</div>
```

### 3. Add Menu Item

If you have a top menu bar, add a menu item:

```jsx
<Menu>
  <MenuItem onClick={handleOpenPluginManager}>
    Plugin Manager
  </MenuItem>
</Menu>
```

### 4. Keyboard Shortcut (Optional)

Add a keyboard shortcut to open the plugin manager:

```jsx
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl+P (or Cmd+P on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        invoke('open_plugin_manager_window');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // ... rest of component
}
```

## Testing the Prototype

### Opening the Plugin Manager

1. Click the button you added
2. A new window titled "Carla Plugin Manager" should open
3. The window shows the plugin management interface

### Using the Plugin Manager

**Add a Plugin:**
1. Click "Add Plugin" button
2. Select a plugin file (.vst, .vst3, .lv2, .so, .dll)
3. A mock plugin entry will be created (prototype doesn't load actual plugins)

**Configure MIDI:**
1. In a plugin card, select a MIDI input device from the dropdown
2. Choose a MIDI channel (1-16)
3. Settings are saved to the plugin configuration

**Configure Audio:**
1. In the "Audio Output Channels" field, enter channel numbers
2. Format: comma-separated (e.g., "1,2" for stereo, "5" for mono)
3. Numbers correspond to audio interface output channels

**Remove a Plugin:**
1. Click the × button in the plugin card header
2. Plugin is immediately unloaded

**Monitor Memory:**
- Memory panel shows usage in real-time
- Green bar: < 50% (safe)
- Yellow bar: 50-75% (caution)
- Red bar: > 75% (critical)

## Example: Full Integration with Activity Bar

Here's a complete example showing how to add the plugin manager to an activity bar:

```jsx
import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import './styles/activity-bar.css';

function ActivityBar() {
  const openPluginManager = async () => {
    try {
      await invoke('open_plugin_manager_window');
    } catch (error) {
      console.error('Failed to open plugin manager:', error);
      alert('Failed to open plugin manager: ' + error);
    }
  };

  return (
    <aside className="activity-bar">
      {/* Existing items */}
      <button className="activity-item" onClick={() => {}}>
        <span className="icon">📖</span>
        <span className="label">Slides</span>
      </button>

      <button className="activity-item" onClick={() => {}}>
        <span className="icon">🎵</span>
        <span className="label">Audio</span>
      </button>

      {/* NEW: Plugin Manager */}
      <button className="activity-item" onClick={openPluginManager}>
        <span className="icon">🎹</span>
        <span className="label">Plugins</span>
      </button>

      <button className="activity-item" onClick={() => {}}>
        <span className="icon">📅</span>
        <span className="label">Scheduler</span>
      </button>
    </aside>
  );
}

export default ActivityBar;
```

### CSS for Activity Bar Item

```css
.activity-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 8px;
  background: #2c2c2c;
  border-right: 1px solid #404040;
}

.activity-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  color: #ccc;
}

.activity-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.activity-item .icon {
  font-size: 24px;
}

.activity-item .label {
  font-size: 11px;
  font-weight: 500;
}
```

## Common Use Cases

### 1. Live Worship Setup

```
Main Window (HarmonySync)
├── Slides/Lyrics display
├── Multitrack audio player
└── [Plugins button] ──> Plugin Manager Window
                          ├── AVL Drums (MIDI: Drum Kit, Ch 10, Audio: 1,2)
                          ├── Keyzone Classic (MIDI: Keyboard, Ch 1, Audio: 3,4)
                          ├── Tonex 1 (Audio: 5)
                          └── Tonex 2 (Audio: 6)
```

### 2. Pre-Service Setup

1. Open plugin manager 30 minutes before service
2. Load required plugins (drums, keys, guitar amps)
3. Configure MIDI and audio routing
4. Test each plugin
5. Save configuration
6. Keep plugin manager open during service for monitoring

### 3. Quick Plugin Changes

- During service, open plugin manager to:
  - Adjust MIDI channels on the fly
  - Enable/disable plugins
  - Monitor memory usage
  - Quickly unload unused plugins

## Troubleshooting

**Plugin Manager Won't Open**
- Check browser console for errors
- Verify `open_plugin_manager_window` command is registered in `lib.rs`
- Check that `plugin-manager.html` exists

**Plugins Don't Load**
- This is expected in the prototype - actual plugin loading requires libcarla
- Mock plugins are created for UI testing

**MIDI Devices Not Showing**
- Prototype shows hardcoded mock devices
- Production version will use `midir` crate for real device enumeration

**Memory Stats Not Updating**
- Check browser console for errors in `get_memory_stats` command
- Memory stats update every 5 seconds automatically

## Next Steps

To move beyond the prototype:

1. **Add libcarla Integration**
   - Create FFI bindings to libcarla C++ API
   - Implement actual plugin loading and hosting

2. **Real MIDI Support**
   - Add `midir` crate to Cargo.toml
   - Replace mock device enumeration
   - Implement MIDI message routing

3. **Real Audio Support**
   - Add `cpal` crate for audio I/O
   - Implement audio routing pipeline
   - Connect plugin outputs to audio interface

4. **Configuration Persistence**
   - Save/load plugin setups to JSON files
   - Implement preset management
   - Add auto-save functionality

## Resources

- See `CARLA_PROTOTYPE_README.md` for detailed implementation notes
- Refer to `CARLA_IMPLEMENTATION_EXAMPLE.md` for code examples
- Check `CARLA_QUICK_START_GUIDE.md` for user documentation

## Support

For questions or issues with the prototype:
1. Check the console logs for error messages
2. Review the implementation files in `src-tauri/src/application/`
3. Refer to the comprehensive Carla documentation in the repository
