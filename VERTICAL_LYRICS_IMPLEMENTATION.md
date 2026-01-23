# Vertical Lyrics Layout Implementation

## Overview
The lyrics display has been updated to show song sections in a vertical flow, making it easier for volunteers to work with complete song sections rather than small 2-line chunks.

## What Changed

### Before (Horizontal 2-Line Chunks)
Previously, lyrics were broken into 2-line slides regardless of song structure:
- Slide 1: Line 1, Line 2
- Slide 2: Line 3, Line 4
- Slide 3: Line 5, Line 6
- etc.

This made it difficult to understand song structure and required frequent slide navigation.

### After (Vertical Section Flow)
Now, each song section becomes a single slide with all lines displayed vertically:
- Slide 1: **[Verse 1]** - All 4-8 lines visible at once
- Slide 2: **[Chorus]** - All 4-8 lines visible at once
- Slide 3: **[Verse 2]** - All 4-8 lines visible at once
- Slide 4: **[Bridge]** - All 4-8 lines visible at once

## Benefits for Volunteers

1. **Complete Context**: See entire verse/chorus at once
2. **Better Structure**: Clear section labels ([Verse 1], [Chorus], etc.)
3. **Easier Navigation**: Jump between sections instead of individual line pairs
4. **Reduced Confusion**: No need to remember what comes next
5. **Professional Appearance**: Cleaner, more organized slide thumbnails

## Technical Implementation

### Lyrics Parsing (`lyrics.js`)
- Groups lines by section markers (e.g., `[Verse 1]`, `[Chorus]`)
- Creates one slide per section with all lines
- Marks slides with `displayMode: 'vertical-section'`

### Slide Display (`Slide.jsx`)
- Displays all section lines vertically with proper spacing
- Adjusts font size based on number of lines (more lines = smaller font)
- Maintains readability with proper line height and gaps

### CSS Updates (`Slide.css`)
- Vertical flex layout with top alignment
- Section label with visual separator
- Scrollable text area for longer sections
- Optimized spacing for thumbnail views

## Usage

### Lyrics File Format
Lyrics files should use section markers:

```
[Verse 1]
Amazing grace how sweet the sound
That saved a wretch like me
I once was lost but now I'm found
Was blind but now I see

[Chorus]
My chains are gone I've been set free
My God my Savior has ransomed me
And like a flood His mercy reigns
Unending love amazing grace

[Verse 2]
'Twas grace that taught my heart to fear
And grace my fears relieved
How precious did that grace appear
The hour I first believed
```

### For Volunteers
1. **Load a song**: Lyrics are automatically parsed into sections
2. **Preview**: See complete sections in slide thumbnails
3. **Navigate**: Use arrow keys or click to move between sections
4. **Display**: Audience sees smooth transitions between complete sections

## Media Integration

The vertical lyrics layout works seamlessly with:
- **Background Videos**: Video loops behind lyrics as before
- **Background Images**: Images display with lyrics overlay
- **Slide Images**: Non-lyric image slides work unchanged
- **YouTube Videos**: Video slides work unchanged

All media types remain accessible in the slide list alongside lyric sections.

## Backward Compatibility

Lyrics files without section markers will:
- Default to "Intro" section
- Group all lines into a single vertical display
- Still be more readable than 2-line chunks

## Future Enhancements

Potential improvements for future versions:
- Section repeat indicators (Verse 1, Verse 1 repeat)
- Custom section colors or icons
- Section preview on hover
- Quick jump to specific section type
