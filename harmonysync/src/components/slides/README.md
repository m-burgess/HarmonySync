# Slide Component

A comprehensive, reusable React component for displaying and interacting with different types of media slides including lyrics, images, videos, and YouTube content.

## Features

- **Multi-Media Support**: Handles lyrics, images, videos, and YouTube content
- **Drag & Drop**: Full drag and drop functionality with visual feedback
- **Interactive Actions**: Hover overlays with contextual action buttons
- **Enlarged Preview**: 5-second hover displays full-size image preview (perfect for scripture reading)
- **Loading States**: Built-in loading indicators for video transcoding
- **Accessibility**: ARIA labels, keyboard navigation, and focus management
- **Responsive**: Multiple size variants with responsive breakpoints
- **Selection States**: Visual selection indicators with animation
- **Professional Styling**: Consistent dark theme with gradients and transitions

## Usage

```jsx
import { Slide } from './components';

// Basic usage
<Slide
  slide={slideData}
  index={0}
  isSelected={false}
  onSelect={(index) => console.log('Selected:', index)}
/>

// Advanced usage with all props
<Slide
  slide={slideData}
  index={0}
  isSelected={selectedIndex === 0}
  onSelect={handleSelect}
  onDragStart={handleDragStart}
  onDragEnter={handleDragEnter}
  onDrop={handleDrop}
  onDragEnd={handleDragEnd}
  onVideoTranscoded={handleVideoTranscoded}
  size="large"
  showActions={true}
  showTypeIcon={true}
  className="custom-slide"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `slide` | `object` | **required** | Slide data object (see Slide Data Structure) |
| `index` | `number` | **required** | Index of the slide in the collection |
| `isSelected` | `boolean` | `false` | Whether the slide is currently selected |
| `onSelect` | `function` | `undefined` | Callback when slide is selected: `(index) => void` |
| `onDragStart` | `function` | `undefined` | Drag start handler: `(event, index) => void` |
| `onDragEnter` | `function` | `undefined` | Drag enter handler: `(event, index) => void` |
| `onDrop` | `function` | `undefined` | Drop handler: `(event, index) => void` |
| `onDragEnd` | `function` | `undefined` | Drag end handler: `(event) => void` |
| `onVideoTranscoded` | `function` | `undefined` | Video transcode callback: `(index, transcodedPath) => void` |
| `size` | `string` | `'medium'` | Size variant: `'small'`, `'medium'`, `'large'` |
| `showActions` | `boolean` | `true` | Whether to show hover action buttons |
| `showTypeIcon` | `boolean` | `true` | Whether to show media type icon |
| `className` | `string` | `''` | Additional CSS classes |

## Slide Data Structure

The `slide` prop expects an object with the following structure:

### Lyrics Slide
```javascript
{
  type: 'lyric', // or undefined
  text: ['Line 1', 'Line 2', 'Line 3', 'Line 4'],
  section: 'Verse 1' // optional
}
```

### Image Slide
```javascript
{
  type: 'image',
  path: '/path/to/image.jpg',
  name: 'Image Name'
}
```

### Video Slide
```javascript
{
  type: 'video',
  path: '/path/to/video.mp4',
  name: 'Video Name',
  duration: 120, // in seconds, optional
  thumbnail_path: '/path/to/thumbnail.jpg' // optional
}
```

### YouTube Slide
```javascript
{
  type: 'youtube',
  videoId: 'dQw4w9WgXcQ',
  name: 'YouTube Video Name'
}
```

## Size Variants

| Size | Dimensions | Use Case |
|------|------------|----------|
| `small` | 160×90px | Compact lists, thumbnails |
| `medium` | 200×112px | Standard slide browsers |
| `large` | 300×169px | Featured slides, previews |

## Events and Interactions

### Enlarged Preview
- **5-Second Hover**: Displays full-size image overlay for better readability
- **Supported Types**: Images, video thumbnails, and YouTube thumbnails  
- **Keyboard Control**: Press Escape to close enlarged preview
- **Click to Close**: Click outside the image to close
- **Perfect for Scripture**: Enlarged text makes scripture images easy to read

### Tauri Events
The component automatically emits Tauri events when slides are clicked:

- **Lyrics**: `display-lyric-slide`, `set-lower-thirds-text`
- **Images**: `display-image-slide`
- **Videos**: `display_video_slide` (after transcoding if needed)
- **YouTube**: `navigate`

### Video Transcoding
Videos are automatically transcoded when needed:
1. Click triggers transcoding check
2. Loading overlay appears during transcoding
3. `onVideoTranscoded` callback receives new path
4. Video plays with transcoded file

### Drag and Drop
Full drag and drop support with visual feedback:
- Drag starts with custom invisible drag image
- Drop zones show orange border and scale effect
- Callbacks provide event and index information

## Styling

### CSS Classes
- `.slide-component` - Main container
- `.slide-small/medium/large` - Size variants
- `.slide-selected` - Selection state
- `.slide-drag-over` - Drag over state
- `.slide-loading` - Loading state

### Customization
Override default styles by targeting CSS classes or using the `className` prop:

```css
.custom-slide {
  border-radius: 1rem;
}

.custom-slide .slide-content {
  background: custom-gradient();
}
```

## Accessibility

- **Keyboard Navigation**: Enter/Space to activate
- **ARIA Labels**: Proper button and image descriptions
- **Focus Management**: Clear focus indicators
- **Screen Readers**: Semantic HTML structure
- **High Contrast**: Support for high contrast mode
- **Reduced Motion**: Respects user motion preferences

## Examples

### Basic Slide Browser
```jsx
const slides = [
  { type: 'lyric', text: ['Hello', 'World'], section: 'Intro' },
  { type: 'image', path: '/image.jpg', name: 'Slide 1' },
  { type: 'video', path: '/video.mp4', name: 'Slide 2', duration: 120 }
];

return (
  <div className="slide-browser">
    {slides.map((slide, index) => (
      <Slide
        key={index}
        slide={slide}
        index={index}
        isSelected={selectedIndex === index}
        onSelect={setSelectedIndex}
        size="medium"
      />
    ))}
  </div>
);
```

### Drag and Drop List
```jsx
const [slides, setSlides] = useState(slideData);
const [draggedIndex, setDraggedIndex] = useState(null);

const handleDragStart = (e, index) => {
  setDraggedIndex(index);
};

const handleDrop = (e, dropIndex) => {
  if (draggedIndex === null) return;
  
  const newSlides = [...slides];
  const draggedSlide = newSlides[draggedIndex];
  newSlides.splice(draggedIndex, 1);
  newSlides.splice(dropIndex, 0, draggedSlide);
  
  setSlides(newSlides);
  setDraggedIndex(null);
};

return (
  <div className="sortable-slides">
    {slides.map((slide, index) => (
      <Slide
        key={slide.id}
        slide={slide}
        index={index}
        onDragStart={handleDragStart}
        onDrop={handleDrop}
        onDragEnd={() => setDraggedIndex(null)}
      />
    ))}
  </div>
);
```

## Dependencies

- React
- @heroicons/react (for icons)
- @tauri-apps/api/event (for Tauri events)
- @tauri-apps/api/core (for Tauri invoke)
- UI components (Card, Button from component library)

## Browser Support

- Modern browsers with ES6+ support
- CSS Grid and Flexbox support required
- HTML5 drag and drop API support