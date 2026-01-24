# Display Settings UI - Visual Guide

## Main Display Settings Dialog

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Display Settings                        × │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Display Configurations                           [+ Add Display]  │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Name              │ Type        │ Device/Output    │ ✓ │ Actions│ │
│  ├───────────────────┼─────────────┼─────────────────┼───┼────────┤ │
│  │ Audience          │ Audience    │ Auto            │ ☑ │ [Edit]  │ │
│  │ Confidence Monitor│ Confidence  │ Auto            │ ☑ │ [Edit]  │ │
│  │ Lower Thirds      │ Lower-thirds│ Auto            │ ☑ │ [Edit]  │ │
│  │ LED Wall Graphics │ Graphics    │ Device: Display2│ ☑ │ [Edit] [Delete]│
│  │ Side Screen Lyrics│ Lyrics      │ NDI: HS-Lyrics  │ ☑ │ [Edit] [Delete]│
│  └───────────────────┴─────────────┴─────────────────┴───┴────────┘ │
│                                                                     │
│  Audience Screen Font                                               │
│  Font Family: [Arial          ▼]                                    │
│  Font Size (px): [72]                                               │
│                                                                     │
│  Confidence Monitor Font                                            │
│  Font Family: [Arial          ▼]                                    │
│  Font Size (px): [72]                                               │
│                                                                     │
│  Audience Screen Preview:                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    SAMPLE LYRIC TEXT                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Confidence Monitor Preview:                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      CURRENT | NEXT                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                          [Cancel]  [Save]           │
└─────────────────────────────────────────────────────────────────────┘
```

## Add/Edit Display Dialog

```
┌──────────────────────────────────────────────────────────┐
│                    Add Display                     × │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Display Name:                                           │
│  [LED Wall for Graphics__________________________]       │
│                                                          │
│  Display Type:                                           │
│  [Graphics            ▼]                                 │
│  Options: Audience, Confidence, Lower-thirds, Lyrics,    │
│           Scripture, Graphics, Custom                    │
│                                                          │
│  Output Type:                                            │
│  [Physical Display    ▼]                                 │
│  Options: Auto (Default), Physical Display, NDI Output   │
│                                                          │
│  Physical Display:                                       │
│  [Display 2 (1920x1080) ▼]                              │
│  (Only shown when "Physical Display" selected)           │
│                                                          │
│  OR                                                      │
│                                                          │
│  NDI Output Name:                                        │
│  [HarmonySync-Graphics________________________]          │
│  (Only shown when "NDI Output" selected)                 │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                  [Cancel]  [Add]         │
└──────────────────────────────────────────────────────────┘
```

## Display Configuration Flow

```
User Opens Display Settings
         │
         ├─→ View All Displays
         │   ├─→ Enable/Disable displays
         │   ├─→ Edit existing display
         │   └─→ Delete display
         │
         ├─→ Add New Display
         │   ├─→ Enter display name
         │   ├─→ Select display type
         │   ├─→ Choose output type
         │   │   ├─→ Auto (Default)
         │   │   ├─→ Physical Display → Select Device
         │   │   └─→ NDI Output → Enter NDI Name
         │   └─→ Save Display
         │
         ├─→ Configure Fonts
         │   ├─→ Audience font settings
         │   └─→ Confidence font settings
         │
         └─→ Save All Settings
```

## Typical Use Case Examples

### Example 1: Simple Church Setup
```
┌─────────────────────────────────────────────┐
│ Display: Audience                           │
│ Type: Audience                              │
│ Output: Display 2 (Main Projector)          │
│ Status: Enabled ✓                           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Display: Confidence Monitor                 │
│ Type: Confidence                            │
│ Output: Display 1 (Operator Laptop)         │
│ Status: Enabled ✓                           │
└─────────────────────────────────────────────┘
```

### Example 2: Large Church Multi-Display
```
┌─────────────────────────────────────────────┐
│ Display: Main Audience                      │
│ Type: Audience                              │
│ Output: Display 2 (Front Projectors)        │
│ Status: Enabled ✓                           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Display: Confidence Monitor                 │
│ Type: Confidence                            │
│ Output: Display 1 (Tech Booth)              │
│ Status: Enabled ✓                           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Display: Lower Thirds                       │
│ Type: Lower-thirds                          │
│ Output: Display 2 (Overlay)                 │
│ Status: Enabled ✓                           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Display: LED Wall Graphics                  │
│ Type: Graphics                              │
│ Output: Display 3 (Stage LED)               │
│ Status: Enabled ✓                           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Display: Left Side Lyrics                   │
│ Type: Lyrics                                │
│ Output: NDI: HarmonySync-Left               │
│ Status: Enabled ✓                           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Display: Right Side Lyrics                  │
│ Type: Lyrics                                │
│ Output: NDI: HarmonySync-Right              │
│ Status: Enabled ✓                           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Display: Scripture Back Wall                │
│ Type: Scripture                             │
│ Output: Display 4 (Back Screen)             │
│ Status: Enabled ✓                           │
└─────────────────────────────────────────────┘
```

## Key Features Highlighted

### ✓ Dynamic List Management
- Add as many displays as needed
- No hardcoded limits
- Easy to reorganize

### ✓ Flexible Output Routing
- Physical monitors
- NDI outputs
- Automatic assignment

### ✓ Display Types
- Predefined types for common use cases
- Custom type for unique setups
- Type determines default behavior

### ✓ Easy Enable/Disable
- Toggle displays without deleting
- Useful for seasonal changes
- Quick setup adjustments

### ✓ Persistent Configuration
- Settings saved automatically
- Survives app restarts
- JSON-based storage

## Color Coding (in actual UI)

- **Green checkbox**: Display is enabled
- **Gray checkbox**: Display is disabled
- **Edit button**: Blue/Primary color
- **Delete button**: Red/Warning color
- **Add Display button**: Green/Success color

## Responsive Design

The dialog adapts to different screen sizes:
- **Large screens**: Table layout with all columns visible
- **Medium screens**: Table with abbreviated columns
- **Small screens**: Card-based layout (future enhancement)
