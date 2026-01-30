# Display Configuration System

## Overview

The display configuration system has been enhanced to support dynamic display management, allowing users to create, configure, and manage multiple display outputs beyond the traditional three hardcoded displays.

## Features

### Dynamic Display Management
- **Add Custom Displays**: Users can create as many display configurations as needed
- **Edit Configurations**: Modify display names, types, and output assignments
- **Delete Displays**: Remove displays that are no longer needed
- **Enable/Disable**: Toggle displays on/off without deleting them
- **Reorder**: Organize displays in preferred order (future enhancement)

### Display Types
Each display can be assigned one of the following types:
- **Audience**: Main presentation screen for congregation
- **Confidence Monitor**: Operator preview screen with next slide
- **Lower Thirds**: Transparent overlay for names/titles
- **Lyrics**: Dedicated lyrics display
- **Scripture**: Bible verse display
- **Graphics**: Graphics and media content
- **Custom**: User-defined display type

### Output Options
Displays can be routed to:
- **Auto (Default)**: System automatically assigns the display
- **Physical Display**: Specific monitor/screen connected to computer
- **NDI Output**: Network Device Interface output for video-over-IP

### Default Configuration
By default, three displays are automatically created:
1. Audience
2. Confidence Monitor
3. Lower Thirds

These can be modified or deleted based on your setup needs.

## Storage

Display configurations are stored in:
```
<userData>/settings/display_configs.json
```

Example configuration:
```json
{
  "displays": [
    {
      "id": "audience",
      "name": "Audience",
      "type": "audience",
      "deviceId": "",
      "ndiOutput": "",
      "enabled": true,
      "order": 1
    },
    {
      "id": "led-wall-graphics",
      "name": "LED Wall Graphics",
      "type": "graphics",
      "deviceId": "2",
      "ndiOutput": "",
      "enabled": true,
      "order": 4
    },
    {
      "id": "side-lyrics",
      "name": "Side Screen Lyrics",
      "type": "lyrics",
      "deviceId": "",
      "ndiOutput": "HarmonySync-Lyrics",
      "enabled": true,
      "order": 5
    }
  ]
}
```

## User Interface

### Display Settings Dialog
Access via: **Settings Menu → Display Settings**

The Display Settings dialog now includes:

1. **Display Configurations Table**
   - Lists all configured displays
   - Shows name, type, output assignment, and enabled status
   - Action buttons for editing and deleting

2. **Add Display Button**
   - Opens form to create new display configuration
   - Required fields: Name, Type
   - Optional: Output assignment (Device or NDI)

3. **Edit Display Form**
   - Modify existing display properties
   - Change name, type, or output assignment
   - Cannot change the display ID

4. **Legacy Font Settings**
   - Audience and Confidence Monitor font configuration
   - Preserved for backward compatibility

## Use Cases

### Church Setup
**Small Church (Basic)**
- Audience (main projector)
- Confidence Monitor (operator laptop)

**Medium Church**
- Audience (main projector)
- Confidence Monitor (operator screen)
- Lower Thirds (main projector overlay)
- Side Lyrics (side screens)

**Large Church**
- Audience (main screens)
- Confidence Monitor (tech booth)
- Lower Thirds (main overlay)
- LED Wall Graphics (stage background)
- Side Lyrics (left/right screens)
- Scripture (back screens)

### Theater/Events
- Stage Display (performers)
- Audience Display (main screen)
- Confidence Monitor (stage manager)
- Lower Thirds (speaker names)

## API Reference

### Electron IPC Handlers

```javascript
// Get all display configurations
await ipcRenderer.invoke('displayConfig:getAll')

// Get specific display
await ipcRenderer.invoke('displayConfig:get', id)

// Create new display
await ipcRenderer.invoke('displayConfig:create', config)

// Update display
await ipcRenderer.invoke('displayConfig:update', id, updates)

// Delete display
await ipcRenderer.invoke('displayConfig:delete', id)

// Reorder displays
await ipcRenderer.invoke('displayConfig:reorder', orderedIds)

// Get enabled displays only
await ipcRenderer.invoke('displayConfig:getEnabled')
```

### React Component Usage

```javascript
import { core } from '../../electron-adapter';

// Get all displays
const configs = await core.invoke('displayConfig:getAll');

// Create new display
const newDisplay = await core.invoke('displayConfig:create', {
  config: {
    name: 'LED Wall',
    type: 'graphics',
    deviceId: '2',
    enabled: true
  }
});

// Update display
await core.invoke('displayConfig:update', {
  id: 'led-wall',
  updates: { deviceId: '3' }
});
```

## Migration Notes

### Backward Compatibility
- Existing `display_settings.json` file is preserved for font settings
- Legacy display assignments (audienceDisplay, confidenceDisplay, lowerThirdsDisplay) are no longer used
- Font settings for Audience and Confidence displays remain in the original file

### Upgrading from Previous Versions
1. On first run, default displays are automatically created
2. Font settings are automatically migrated
3. No manual intervention required

## Future Enhancements

Potential improvements for future releases:
- Drag-and-drop display reordering
- Display preview thumbnails
- Multi-monitor automatic detection and assignment
- Display templates/presets
- NDI source discovery and selection
- Per-display font and style configuration
- Display groups (e.g., "Main Sanctuary", "Overflow Room")

## Technical Implementation

### Files Modified
- `electron/services/display-config-service.js` - Core display configuration service
- `electron/main.js` - Service initialization
- `electron/ipc-handlers.js` - IPC communication handlers
- `electron/preload.js` - Renderer API exposure
- `harmonysync/src/electron-adapter/index.js` - React-Electron bridge
- `harmonysync/src/components/screens/DisplaySettings.jsx` - UI component

### Testing
Unit tests located in:
- `electron/services/__tests__/display-config-service.test.js`

Run tests with:
```bash
npm test
```

## Troubleshooting

### Displays Not Showing
1. Check that displays are enabled in Display Settings
2. Verify physical displays are connected and recognized by OS
3. Check NDI output names match NDI sender configuration

### Configuration Not Persisting
1. Ensure application has write permissions to userData directory
2. Check for errors in console logs
3. Verify `display_configs.json` is being created in settings folder

### Can't Delete Default Displays
- All displays can be deleted, including defaults
- They will not be automatically recreated unless the config file is deleted

## Support

For issues or questions about the display configuration system:
1. Check application logs for error messages
2. Review this documentation
3. Create an issue in the GitHub repository with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots of Display Settings dialog
   - Contents of `display_configs.json` (if relevant)
