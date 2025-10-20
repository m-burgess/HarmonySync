# Scheduler Feature - Visual Overview

## Activity Bar with Calendar Icon

The calendar icon appears in the left activity bar:

```
┌────────────┐
│            │ ← Service Order (active)
│     📊     │
├────────────┤
│            │ ← SCHEDULER (new!)
│     📅     │ ← Click to open scheduler
├────────────┤
│            │ ← Pre-Service Music
│     ▶️     │
├────────────┤
│            │ ← Import Song
│     🎵     │
├────────────┤
│            │ ← Import Presentation
│     📊     │
├────────────┤
│            │ ← Settings
│     ⚙️     │
└────────────┘
```

## Scheduler Modal Dialog

When you click the calendar icon, a modal dialog appears:

```
╔══════════════════════════════════════════════════════════════════╗
║  Scheduler                                                    ✕  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ┌─────────────── Schedule New Event ────────────────────────┐  ║
║  │                                                             │  ║
║  │  Select Macro:        [Start Pre-service Music ▼]         │  ║
║  │                       ┌──────────────────────────────┐     │  ║
║  │                       │ Pre-service Music            │     │  ║
║  │                       │  • Start Pre-service Music   │     │  ║
║  │                       │  • Stop Pre-service Music    │     │  ║
║  │                       ├──────────────────────────────┤     │  ║
║  │                       │ MIDI Notes                   │     │  ║
║  │                       │  • MIDI C4 (Middle C)        │     │  ║
║  │                       │  • MIDI C#4                  │     │  ║
║  │                       │  • MIDI D4                   │     │  ║
║  │                       │  • ... (C4 through C5)       │     │  ║
║  │                       └──────────────────────────────┘     │  ║
║  │                                                             │  ║
║  │  Day of Week:         [Saturday ▼]                         │  ║
║  │  Time:                [16:30]                              │  ║
║  │  ☑ Recurring weekly                                        │  ║
║  │                                                             │  ║
║  │  [➕ Add Scheduled Event]                                  │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                  ║
║  ┌─────────────── Scheduled Events ──────────────────────────┐  ║
║  │                                                             │  ║
║  │  ☑ Start Pre-service Music                                │  ║
║  │     Every Saturday at 16:30                          🗑️   │  ║
║  │                                                             │  ║
║  │  ☑ Stop Pre-service Music                                 │  ║
║  │     Every Saturday at 16:55                          🗑️   │  ║
║  │                                                             │  ║
║  │  ☑ MIDI C4 (Middle C)                                     │  ║
║  │     Every Sunday at 10:00                            🗑️   │  ║
║  │                                                             │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                  ║
║  ┌─────────────── Weekly Overview ────────────────────────────┐  ║
║  │  Sun     Mon     Tue     Wed     Thu     Fri     Sat       │  ║
║  │ ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐          │  ║
║  │ │10:0│  │   │  │   │  │   │  │   │  │   │  │16:3│          │  ║
║  │ │   │  │   │  │   │  │   │  │   │  │   │  │16:5│          │  ║
║  │ └───┘  └───┘  └───┘  └───┘  └───┘  └───┘  └───┘          │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

## Component Breakdown

### 1. Schedule New Event Section
This section contains the form to create new scheduled events:
- **Macro Selector**: Dropdown with macros grouped by type
  - Pre-service Music group
  - MIDI Notes group
- **Day Selector**: Dropdown with all 7 days of the week
- **Time Input**: Time picker in 24-hour format (HH:MM)
- **Recurring Checkbox**: Enable/disable weekly recurrence
- **Add Button**: Creates the scheduled event

### 2. Scheduled Events List
Shows all currently scheduled events with:
- **Enable Checkbox**: Toggle event on/off without deleting
- **Event Details**: Shows macro name, day, and time
- **Delete Button**: Trash icon to permanently remove event
- **Visual State**: Disabled events appear with reduced opacity

### 3. Weekly Overview Calendar
A visual calendar showing:
- **7 Day Grid**: One column per day (Sun-Sat)
- **Event Chips**: Blue chips showing scheduled times
- **Tooltip**: Hover to see full event details

## Example Workflow

### Setting up Pre-Service Music Automation

**Step 1: Open Scheduler**
- Click calendar icon in activity bar

**Step 2: Create Start Event**
1. Select "Start Pre-service Music" from dropdown
2. Choose "Saturday" 
3. Set time "16:30" (4:30 PM)
4. Ensure "Recurring weekly" is checked
5. Click "Add Scheduled Event"

**Step 3: Create Stop Event**
1. Select "Stop Pre-service Music"
2. Choose "Saturday"
3. Set time "16:55" (4:55 PM)
4. Ensure "Recurring weekly" is checked
5. Click "Add Scheduled Event"

**Result:**
- Both events appear in "Scheduled Events" list
- Both events show as blue chips on Saturday in the calendar
- Every Saturday at 4:30 PM, music starts automatically
- Every Saturday at 4:55 PM, music stops automatically

## UI Color Scheme

The scheduler uses the application's existing dark theme:
- **Background**: Dark gray (#1F2937, #111827)
- **Text**: White and light gray
- **Active Elements**: Blue (#2563EB)
- **Disabled**: Reduced opacity with gray tint
- **Destructive Actions**: Red for delete button
- **Borders**: Subtle gray borders

## Responsive Design

The scheduler modal:
- Fixed width of 800px
- Maximum height of 90vh (90% of viewport height)
- Scrollable content area if needed
- Centered on screen with dark overlay background
- Close button (X) in top-right corner

## Accessibility Features

- Clear labels for all form inputs
- Hover states on interactive elements
- Visual feedback for enabled/disabled states
- Keyboard accessible (can use Tab to navigate)
- Close on Escape key (standard modal behavior)

## Integration with Existing UI

The scheduler follows the same design patterns as other modals in the app:
- Similar to Display Settings modal
- Similar to Pre-service Music modal
- Consistent typography and spacing
- Matches VS Code-inspired activity bar design
