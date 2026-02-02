# Quick Reference: Setlist → ServiceOrder Migration

## TL;DR

"Setlist" has been renamed to "ServiceOrder" throughout the application. Update your imports, types, and references accordingly.

## Import Changes

```typescript
// ❌ Old imports
import { SetlistService } from './services/SetlistService';
import { SetlistViewModel } from './viewmodels/SetlistViewModel';
import { SetlistManager, SetlistItem } from './components/setlist';
import type { SetlistFolder, ISetlistService, ISetlistViewModel } from './types';

// ✅ New imports
import { ServiceOrderService } from './services/ServiceOrderService';
import { ServiceOrderViewModel } from './viewmodels/ServiceOrderViewModel';
import { ServiceOrderManager, ServiceItem } from './components/service-order';
import type { ServiceOrderFolder, IServiceOrderService, IServiceOrderViewModel } from './types';
```

## Type Changes

```typescript
// ❌ Old types
interface SetlistFolder { }
interface SetlistItem { }
interface ISetlistService { }
interface ISetlistViewModel { }

// ✅ New types
interface ServiceOrderFolder { }
interface ServiceItem { }
interface IServiceOrderService { }
interface IServiceOrderViewModel { }
```

## Component Changes

```typescript
// ❌ Old component usage
<SetlistManager 
  setAllSlides={setSlides}
  setAllTracks={setTracks}
/>
<SetlistItem item={item} />

// ✅ New component usage
<ServiceOrderManager 
  setAllSlides={setSlides}
  setAllTracks={setTracks}
/>
<ServiceItem item={item} />
```

## ViewModel Changes

```typescript
// ❌ Old ViewModel usage
const viewModel = getViewModel('setlistViewModel');
await viewModel.loadSetlist(path);
const items = viewModel.setlist;

// ✅ New ViewModel usage
const viewModel = getViewModel('serviceOrderViewModel');
await viewModel.loadServiceOrder(path);
const items = viewModel.serviceOrder;
```

## Event Changes

```typescript
// ❌ Old events
EVENT_TYPES.SONG_LOADED = 'setlist:song-loaded'
EVENT_TYPES.SONG_CHANGED = 'setlist:song-changed'
EVENT_TYPES.FOLDER_ADDED = 'setlist:folder-added'
EVENT_TYPES.SETLIST_UPDATED = 'setlist:updated'

// ✅ New events
EVENT_TYPES.SONG_LOADED = 'service-order:song-loaded'
EVENT_TYPES.SONG_CHANGED = 'service-order:song-changed'
EVENT_TYPES.FOLDER_ADDED = 'service-order:folder-added'
EVENT_TYPES.SERVICE_ORDER_UPDATED = 'service-order:updated'
```

## IPC Channel Changes

```typescript
// ❌ Old IPC channels
ipc.invoke('setlist:loadSongMetadata', path)
ipc.invoke('setlist:loadLyrics', path)
ipc.invoke('setlist:openLyricsFile', path)

// ✅ New IPC channels
ipc.invoke('service-order:loadSongMetadata', path)
ipc.invoke('service-order:loadLyrics', path)
ipc.invoke('service-order:openLyricsFile', path)
```

## CSS Changes

```css
/* ❌ Old CSS classes */
.setlist-item { }
.setlist-item-header { }
.setlist-item-name { }
.setlist-item-loaded { }

/* ✅ New CSS classes */
.service-item { }
.service-item-header { }
.service-item-name { }
.service-item-loaded { }
```

## File Locations

```
❌ Old locations:
- src/services/SetlistService.ts
- src/viewmodels/SetlistViewModel.ts
- src/components/setlist/SetlistManager.jsx
- src/components/setlist/SetlistItem.jsx
- src/styles/components/SetlistItem.css

✅ New locations:
- src/services/ServiceOrderService.ts
- src/viewmodels/ServiceOrderViewModel.ts
- src/components/service-order/ServiceOrderManager.tsx
- src/components/service-order/ServiceItem.tsx
- src/styles/components/ServiceItem.css
```

## Test File Changes

```
❌ Old test files:
- __tests__/services/SetlistService.test.js
- __tests__/viewmodels/SetlistViewModel.test.js

✅ New test files:
- __tests__/services/ServiceOrderService.test.js
- __tests__/viewmodels/ServiceOrderViewModel.test.js
```

## Search and Replace Guide

If updating your code manually, use these patterns:

| Find | Replace |
|------|---------|
| `SetlistService` | `ServiceOrderService` |
| `SetlistViewModel` | `ServiceOrderViewModel` |
| `SetlistFolder` | `ServiceOrderFolder` |
| `SetlistItem` | `ServiceItem` |
| `SetlistManager` | `ServiceOrderManager` |
| `ISetlistService` | `IServiceOrderService` |
| `ISetlistViewModel` | `IServiceOrderViewModel` |
| `setlistViewModel` | `serviceOrderViewModel` |
| `setlistService` | `serviceOrderService` |
| `'setlist:` | `'service-order:` |
| `.setlist-item` | `.service-item` |
| `loadSetlist` | `loadServiceOrder` |

## Common Patterns

### Pattern 1: Service Injection
```typescript
// ❌ Old
constructor(setlistService: ISetlistService) {
  this.setlistService = setlistService;
}

// ✅ New
constructor(serviceOrderService: IServiceOrderService) {
  this.serviceOrderService = serviceOrderService;
}
```

### Pattern 2: Observable Properties
```typescript
// ❌ Old
@observable setlist: SetlistItem[] = [];

// ✅ New
@observable serviceOrder: ServiceItem[] = [];
```

### Pattern 3: Event Subscription
```typescript
// ❌ Old
eventBus.subscribe('setlist:song-loaded', (payload) => {
  // handle event
});

// ✅ New
eventBus.subscribe('service-order:song-loaded', (payload) => {
  // handle event
});
```

## What Didn't Change

✅ No functional changes
✅ No API changes (except naming)
✅ No breaking changes in behavior
✅ MVVM architecture remains the same
✅ MobX patterns remain the same
✅ Test coverage remains the same

## Need Help?

See the complete documentation:
- `REFACTORING_COMPLETE_SUMMARY.md` - Full details of all changes
- TypeScript will catch most issues at compile time
- Tests will catch runtime issues

## Verify Your Changes

```bash
# Ensure TypeScript compiles
npm run typecheck

# Run tests
npm test

# Build the application
npm run build
```

---

**Remember**: This is a pure terminology refactoring. The functionality is identical, only the names have changed!
