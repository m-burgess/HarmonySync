# Quick Reference Guide - Service Order Components

## Import Statements

### TypeScript/TSX Files
```typescript
// Import the manager
import { ServiceOrderManager } from './components/service-order';
// or
import ServiceOrderManager from './components/service-order/ServiceOrderManager.tsx';

// Import the item component
import { ServiceItem } from './components/service-order';
// or
import ServiceItem from './components/service-order/ServiceItem.tsx';
```

## Component Usage

### ServiceOrderManager

```tsx
<ServiceOrderManager 
  setAllSlides={(slides) => console.log(slides)}
  setAllTracks={(tracks) => console.log(tracks)}
  setIsLoadingTracks={(loading) => console.log(loading)}
  setCurrentLyrics={(lyrics) => console.log(lyrics)}
/>
```

**Props:**
- `setAllSlides?: (slides: unknown[]) => void` - Callback when slides are loaded
- `setAllTracks?: (tracks: unknown[]) => void` - Callback when tracks are loaded
- `setIsLoadingTracks?: (loading: boolean) => void` - Callback for loading state
- `setCurrentLyrics?: (lyrics: string) => void` - Callback when lyrics are set

### ServiceItem

```tsx
<ServiceItem
  item={{
    id: 'song-1',
    name: 'Amazing Grace',
    path: '/path/to/song',
    type: 'song',
    lyrics: '...'
  }}
  index={0}
  isLoaded={true}
  onItemClick={(item, index) => console.log('Clicked', item)}
  onRemove={(index) => console.log('Remove', index)}
  onTransition={(item, index, type) => console.log('Transition', type)}
  onPreload={(item, index) => console.log('Preload', item)}
  onEditLyrics={(item, index) => console.log('Edit lyrics', item)}
  className="custom-class"
/>
```

**Props:**
- `item: ServiceItemData` - The service order item data (required)
- `index: number` - Position in the service order (required)
- `isLoaded?: boolean` - Whether the item is currently loaded
- `onItemClick?: (item, index) => void` - Click handler
- `onRemove?: (index) => void` - Remove handler
- `onTransition?: (item, index, transitionType) => void` - Transition handler
- `onPreload?: (item, index) => void` - Preload handler
- `onEditLyrics?: (item, index) => void` - Edit lyrics handler
- `className?: string` - Additional CSS classes

## Type Definitions

### ServiceItemData
```typescript
interface ServiceItemData {
  id?: string;                                    // Optional unique identifier
  name: string;                                   // Display name (required)
  path: string;                                   // File/folder path (required)
  type: 'song' | 'presentation' | 'folder';      // Item type (required)
  tracks?: unknown[];                             // Optional audio tracks
  lyrics?: string;                                // Optional lyrics text
}
```

### Creating a Service Order Item
```typescript
const songItem: ServiceItemData = {
  id: 'song-123',
  name: 'How Great Thou Art',
  path: '/path/to/songs/how-great-thou-art',
  type: 'song',
  lyrics: 'O Lord my God...'
};

const presentationItem: ServiceItemData = {
  name: 'Announcements',
  path: '/path/to/presentations/announcements.pptx',
  type: 'presentation'
};
```

## CSS Classes

### Service Order Manager
- `#service-order-col` - The sidebar container
- `#service-order` - The unordered list container

### Service Order Item
- `.service-item` - Base item class
- `.service-item-loaded` - When item is loaded
- `.service-item-header` - Item header section
- `.service-item-name` - Item name/title
- `.service-item-remove` - Remove button
- `.service-item-transitions` - Transition buttons container
- `.service-order-item` - List item in manager (different from ServiceItem component)
- `.current-song` - Currently playing/selected item

### Custom Styling Example
```css
/* Override default styles */
.service-item {
  background-color: #2a2a2a;
  border: 1px solid #3a3a3a;
}

.service-item:hover {
  background-color: #3a3a3a;
}

/* Style current song differently */
.service-order-item.current-song {
  background-color: rgba(59, 130, 246, 0.2);
  border-left: 4px solid #3b82f6;
}
```

## DOM IDs

| ID | Purpose |
|----|---------|
| `#service-order-col` | Main sidebar column for service order |
| `#service-order` | List element containing all service order items |
| `#add-folder-button` | Button to add folders to service order |
| `#crossfade-duration` | Crossfade duration slider |
| `#autoplay-enabled` | Autoplay checkbox |

## Event Handlers

### Click Handlers
```typescript
// Handle item click
const handleItemClick = (item: ServiceItemData, index: number) => {
  console.log(`Clicked ${item.name} at position ${index}`);
  // Load the item...
};

// Handle remove
const handleRemove = (index: number) => {
  console.log(`Remove item at index ${index}`);
  // Remove from service order...
};

// Handle transition
const handleTransition = (
  item: ServiceItemData, 
  index: number, 
  transitionType: string
) => {
  console.log(`Transition ${item.name} using ${transitionType}`);
  // Apply transition...
};
```

## ViewModel Integration

The components use MobX ViewModel accessed via:
```typescript
import { getViewModel } from './viewmodels';

const viewModel = getViewModel('setlistViewModel');

// Access observable properties
console.log(viewModel.serviceOrder);      // Array of items
console.log(viewModel.currentSongIndex);  // Current song index
console.log(viewModel.autoplayEnabled);   // Autoplay state

// Call action methods
viewModel.loadItem(item, index);
viewModel.addFolders();
viewModel.toggleAutoplay();
viewModel.preloadSong(item);
```

## Common Patterns

### Adding Items to Service Order
```typescript
const addSongToServiceOrder = async (songPath: string) => {
  const viewModel = getViewModel('setlistViewModel');
  await viewModel.addFolders(); // Opens folder picker
  // Or programmatically add:
  // viewModel.serviceOrder.push({ name: '...', path: songPath, type: 'song' });
};
```

### Loading an Item
```typescript
const loadServiceItem = async (item: ServiceItemData, index: number) => {
  const viewModel = getViewModel('setlistViewModel');
  const result = await viewModel.loadItem(item, index);
  
  if (result) {
    // Update UI with slides and tracks
    setSlides(result.slides || []);
    setTracks(result.tracks || []);
  }
};
```

### Checking Preload Status
```typescript
const isItemPreloaded = (item: ServiceItemData): boolean => {
  const viewModel = getViewModel('setlistViewModel');
  return viewModel.isSongPreloaded(item);
};
```

## Troubleshooting

### Common Issues

**Import Error: Cannot find module**
```typescript
// Wrong:
import { ServiceItem } from './components/service-order/ServiceItem';

// Correct:
import { ServiceItem } from './components/service-order';
// or
import ServiceItem from './components/service-order/ServiceItem.tsx';
```

**Type Error: Property 'serviceOrder' does not exist**
```typescript
// You might need to cast the ViewModel:
const viewModel = getViewModel('setlistViewModel') as ServiceOrderViewModel;
```

**CSS Not Applied**
```typescript
// Make sure CSS is imported:
import '../../styles/components/ServiceItem.css';
```

**ViewModel Not Updating UI**
```typescript
// Wrap component with observer:
import { observer } from 'mobx-react-lite';

const MyComponent = observer(() => {
  const viewModel = getViewModel('setlistViewModel');
  return <div>{viewModel.serviceOrder.length}</div>;
});
```

## Testing

### Unit Test Example
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import ServiceItem from './ServiceItem';

describe('ServiceItem', () => {
  const mockItem: ServiceItemData = {
    name: 'Test Song',
    path: '/test/path',
    type: 'song'
  };

  it('renders item name', () => {
    render(<ServiceItem item={mockItem} index={0} />);
    expect(screen.getByText('Test Song')).toBeInTheDocument();
  });

  it('calls onItemClick when clicked', () => {
    const handleClick = jest.fn();
    render(
      <ServiceItem 
        item={mockItem} 
        index={0} 
        onItemClick={handleClick}
      />
    );
    
    fireEvent.click(screen.getByText('Test Song'));
    expect(handleClick).toHaveBeenCalledWith(mockItem, 0);
  });
});
```

## Migration from Old Code

If you have code using the old components:

### Step 1: Update Imports
```typescript
// Old:
import { SetlistManager, SetlistItem } from './components/service-order';

// New:
import { ServiceOrderManager, ServiceItem } from './components/service-order';
```

### Step 2: Update Component Names
```jsx
// Old:
<SetlistManager {...props} />

// New:
<ServiceOrderManager {...props} />
```

### Step 3: Update CSS Classes (if you have custom CSS)
```css
/* Old: */
.setlist-item { }

/* New: */
.service-item { }
```

### Step 4: Update Variable Names
```typescript
// Old:
const [setlist, setSetlist] = useState([]);

// New:
const [serviceOrder, setServiceOrder] = useState([]);
```

---

**Last Updated:** January 29, 2025  
**Version:** 1.0.0
