# Components Library

This folder contains reusable React components organized by functionality. The components are designed to be modular, accessible, and consistent with the application's dark theme.

## Structure

```
components/
├── ui/           # Basic UI components
├── audio/        # Audio-related components
├── library/      # Library management components
├── setlist/      # Setlist management components
└── displays/     # Display screen components (future)
```

## Usage

Import components using the barrel exports:

```jsx
// Import individual components
import { Button, Input, Card } from '../components/ui';
import { TransitionButton, VolumeSlider } from '../components/audio';

// Or import everything
import { Button, TransitionButton, LibraryItem } from '../components';
```

## UI Components

### Button
Versatile button component with multiple variants and sizes.

```jsx
<Button variant="primary" size="medium" onClick={handleClick}>
  Click me
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'outline' | 'ghost'
- `size`: 'small' | 'medium' | 'large' | 'icon-only'
- `disabled`: boolean
- `loading`: boolean
- `icon`: ReactNode

### Input
Styled input component with validation support.

```jsx
<Input
  placeholder="Search songs..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  icon={<SearchIcon />}
  variant="search"
/>
```

**Props:**
- `variant`: 'default' | 'search' | 'bordered' | 'underlined'
- `size`: 'small' | 'medium' | 'large'
- `error`: boolean
- `errorMessage`: string
- `icon`: ReactNode

### Card
Container component for grouping related content.

```jsx
<Card 
  variant="elevated" 
  padding="medium" 
  hover={true}
  header="Track Information"
>
  <p>Content goes here</p>
</Card>
```

### Modal
Accessible modal dialog component.

```jsx
<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Settings"
  size="medium"
>
  <SettingsForm />
</Modal>
```

## Audio Components

### TransitionButton
Specialized buttons for audio transitions.

```jsx
<TransitionButton
  type="crossfade"
  onClick={() => handleTransition('crossfade')}
  size="small"
/>
```

**Types:** 'crossfade' | 'cut' | 'fade' | 'preload' | 'load'

### VolumeSlider
Vertical or horizontal volume control slider.

```jsx
<VolumeSlider
  value={volume}
  onChange={setVolume}
  orientation="vertical"
  showValue={true}
/>
```

### PanControl
Three-button pan control (L-C-R).

```jsx
<PanControl
  value={panValue}
  onChange={setPanValue}
  disabled={isMuted}
/>
```

### TrackControlCard
Complete track control interface combining volume, pan, mute, and solo.

```jsx
<TrackControlCard
  trackId="track1"
  trackName="Vocals"
  volume={0.8}
  panValue={0}
  isMuted={false}
  onVolumeChange={handleVolumeChange}
  onPanChange={handlePanChange}
  onMuteToggle={handleMuteToggle}
/>
```

## Library Components

### LibraryItem
Displays a library item (song/presentation) with add button.

```jsx
<LibraryItem
  item={song}
  onAdd={addToSetlist}
  onSelect={selectSong}
  isSelected={selectedSong?.id === song.id}
/>
```

## Setlist Components

### SetlistItem
Displays a setlist item with transition controls.

```jsx
<SetlistItem
  item={setlistItem}
  index={index}
  isLoaded={item.loaded}
  onItemClick={handleItemClick}
  onRemove={handleRemove}
  onTransition={handleTransition}
  onPreload={handlePreload}
/>
```

## Theming

All components use CSS custom properties for theming. The main theme colors are:

```css
:root {
  --color-primary: #007bff;
  --color-secondary: #6c757d;
  --color-success: #28a745;
  --color-danger: #dc3545;
  --color-warning: #ffc107;
  --color-info: #17a2b8;
  
  --bg-primary: #1e1e1e;
  --bg-secondary: #2d2d2d;
  --bg-tertiary: #3a3a3a;
  
  --text-primary: #d4d4d4;
  --text-secondary: #999;
  --text-muted: #666;
}
```

## Accessibility

- All interactive components support keyboard navigation
- Proper ARIA labels and roles are implemented
- Focus indicators are clearly visible
- Color contrast meets WCAG guidelines
- Screen reader support for complex components

## Development Guidelines

1. **Component Structure**: Each component should have its own folder with `.jsx` and `.css` files
2. **PropTypes**: Use TypeScript or PropTypes for type checking
3. **Testing**: Include unit tests for component logic
4. **Documentation**: Update this README when adding new components
5. **CSS**: Use CSS modules or styled-components for component-scoped styles

## Future Components

Planned components for development:
- `Slider` - Generic range slider
- `Toggle` - Switch/toggle component
- `Dropdown` - Select dropdown with search
- `Tabs` - Tab navigation component
- `ProgressBar` - Progress indicator
- `Toast` - Notification component
- `Tooltip` - Hover tooltip
- `ContextMenu` - Right-click context menu