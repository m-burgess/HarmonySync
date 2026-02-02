# Scrollable Lyrics Column with 2-Line Selection

## Overview
The lyrics system now displays the entire song in a single scrollable column, allowing volunteers to see all lyrics and sections at once while selecting 2 lines at a time to display to the audience.

## Features

### 1. **Complete Song Visibility**
- Entire song displayed in one scrollable column
- All sections visible: [Verse 1], [Chorus], [Bridge], etc.
- Section labels clearly highlighted in cyan
- Easy to understand song structure at a glance

### 2. **2-Line Selection**
- Click any line to select a 2-line pair
- Selected lines are highlighted with cyan background and animated border
- Only selected 2 lines are displayed to the audience

### 3. **Keyboard Navigation**
- **↑ (Up Arrow)**: Move selection up by 2 lines
- **↓ (Down Arrow)**: Move selection down by 2 lines
- Auto-scroll keeps selection visible in viewport

### 4. **Mouse Hover**
- Hover over any line to see which 2-line pair it belongs to
- Hovered pairs show blue background
- Clear visual feedback before clicking

### 5. **Auto-Scroll**
- Selection automatically scrolls into view
- Keeps selected lines centered when navigating
- Smooth scrolling animation

## User Interface

### Layout
```
┌─────────────────────────────────────┐
│ Song Lyrics                         │
│ Click or use ↑↓ arrows to select   │
├─────────────────────────────────────┤
│                                     │
│ [Verse 1]                          │ ← Section Label (Cyan)
│ Amazing grace how sweet the sound  │ ← Lyric Line
│ That saved a wretch like me        │ ← Lyric Line
│ I once was lost but now I'm found  │ ← Lyric Line (can hover/click)
│ Was blind but now I see            │ ← Lyric Line
│                                     │
│ [Chorus]                           │ ← Section Label
│ ┃ My chains are gone               │ ◄ Selected (2 lines)
│ ┃ I've been set free               │ ◄ Selected
│ And like a flood His mercy reigns  │
│ Unending love amazing grace        │
│                                     │
│ [Verse 2]                          │
│ ...                                 │
│                                     │
├─────────────────────────────────────┤
│ Showing lines 5-6 of 16            │
└─────────────────────────────────────┘
```

### Visual States

#### Selected Lines (Current)
- **Background**: Cyan gradient
- **Border**: 2px animated cyan border with pulse effect
- **Left Accent**: 4px solid cyan bar
- **Font Weight**: Medium/Bold
- **Effect**: Pulsing glow animation

#### Hovered Lines (Preview)
- **Background**: Blue semi-transparent
- **Color**: White
- **Effect**: Smooth transition on hover

#### Section Labels
- **Background**: Cyan semi-transparent
- **Border-Left**: 3px solid cyan
- **Text**: Uppercase cyan
- **Spacing**: Extra margin above for separation

## Interaction Flow

### Loading a Song with Lyrics
1. User clicks song in setlist
2. System loads lyrics file
3. Lyrics column replaces slide grid
4. First 2 lines auto-selected
5. First 2 lines displayed to audience

### Selecting Lines with Mouse
1. User hovers over any line
2. That line's 2-line pair highlights in blue
3. User clicks the line
4. Selection updates to that pair
5. Audience display updates automatically
6. Selection scrolls into view if needed

### Selecting Lines with Keyboard
1. User presses ↓ (Down Arrow)
2. Selection moves down 2 lines
3. Auto-scroll keeps selection visible
4. Audience display updates
5. User presses ↑ (Up Arrow)
6. Selection moves up 2 lines

### Continuous Operation
1. Continue navigating with ↑↓ or mouse
2. Each selection instantly updates audience
3. Confidence monitor shows next 2 lines
4. Section context always visible

## Benefits

### For Volunteers
✅ **Complete Context**: See entire song structure
✅ **Easy Navigation**: Jump to any section or line
✅ **Clear Selection**: Always know what's being displayed
✅ **Section Awareness**: Labels show current song section
✅ **Flexible Control**: Use mouse or keyboard
✅ **Visual Feedback**: Hover and selection highlights

### For Workflow
✅ **Faster Setup**: No need to create slides
✅ **Less Confusion**: One view for entire song
✅ **Quick Corrections**: Easy to jump back/forward
✅ **Professional Appearance**: Clean, organized interface
✅ **Reduced Errors**: Clear visual states

### Technical
✅ **Efficient**: Single component, minimal state
✅ **Accessible**: Keyboard navigation, ARIA labels
✅ **Responsive**: Works on any screen size
✅ **Smooth**: Auto-scroll and transitions
✅ **Performant**: Handles songs of any length

## Technical Implementation

### Component Structure
```
LyricsColumn
├── Header (Title + Instructions)
├── Content (Scrollable lyrics)
│   ├── Section Labels
│   └── Lyric Lines (clickable, hoverable)
└── Footer (Line counter)
```

### Key Features
- **React Hooks**: useState, useEffect, useRef, useMemo
- **Auto-scroll**: Uses scrollIntoView API
- **Event Emission**: Emits to audience/confidence displays
- **Smart Selection**: Always selects even-numbered pairs
- **Performance**: useMemo for lyrics parsing

### Props
- `lyrics` (string): Full lyrics text with section markers
- `onSelectionChange` (function): Callback when selection changes

### Events Emitted
- `display-lyric-slide`: Updates audience screen
- `display-confidence-slide`: Updates confidence monitor

## Comparison: Old vs New

### Old Approach (Section-Based Slides)
```
[Verse 1] Slide → All 4 lines shown
[Chorus] Slide → All 4 lines shown
[Verse 2] Slide → All 4 lines shown
```
- Fewer slides but still fragmented
- Can't see whole song at once
- Still navigating between slides

### New Approach (Scrollable Column)
```
┌─────────────────┐
│ [Verse 1]       │ ◄ All visible
│ line 1          │   at once
│ line 2          │
│ line 3          │
│ line 4          │
│                 │
│ [Chorus]        │
│ line 1  ◄ selected
│ line 2  ◄ selected
│ line 3          │
│ line 4          │
│  ...            │
│ [Verse 2]       │
│  ...            │
└─────────────────┘
```
- Complete song visible
- Select any 2 lines
- Navigate smoothly
- Full context always available

## Use Cases

### 1. **Regular Song Presentation**
- Load song from setlist
- Auto-starts at line 1-2
- Navigate through song with arrows
- Audience sees 2 lines at a time

### 2. **Quick Jump to Chorus**
- Scroll down to [Chorus] section
- Click first line of chorus
- Instantly displays chorus to audience
- No need to click through many slides

### 3. **Repeat a Section**
- Use mouse to click back to verse 1
- Or use ↑ arrow multiple times
- Instant feedback and display

### 4. **Practice/Rehearsal**
- See complete song structure
- Preview upcoming sections
- Jump anywhere quickly
- Confidence monitor shows next lines

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ↓ | Select next 2 lines (down) |
| ↑ | Select previous 2 lines (up) |
| Mouse Click | Select clicked line's pair |
| Mouse Hover | Preview 2-line pair |

## Future Enhancements

Potential improvements:
- Jump to specific section (hotkeys for V, C, B)
- Mark repeated sections
- Custom line grouping (3 lines, 4 lines)
- Annotation/notes on sections
- Loop sections for practice
- Font size adjustment
- Color themes for different services

## Conclusion

The scrollable lyrics column provides the best of both worlds:
- **Complete visibility** of entire song structure
- **Precise control** over 2-line audience display
- **Flexible navigation** with mouse or keyboard
- **Professional workflow** for volunteers

This approach makes it significantly easier for volunteers to work with lyrics while maintaining the clean 2-line display that audiences expect.
