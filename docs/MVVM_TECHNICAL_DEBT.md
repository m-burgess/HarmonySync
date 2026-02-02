# MVVM Implementation - Technical Debt & Future Improvements

This document tracks identified technical debt from the MVVM implementation and proposes future improvements.

## Code Review Findings

### 1. Window Object Direct Access in SlideViewModel
**Location**: `harmonysync/src/viewmodels/SlideViewModel.js:132`  
**Issue**: Direct access to global `window` object for event dispatching  
**Current Code**:
```javascript
if (typeof window !== 'undefined' && window.dispatchEvent) {
  const customEvent = new CustomEvent('service-imported', { detail: serviceStructure });
  window.dispatchEvent(customEvent);
}
```

**Impact**: 
- Couples ViewModel to browser environment
- Makes testing harder
- Violates pure business logic pattern

**Proposed Solution**:
- Create an `EventBusService` or use RxJS for ViewModel-to-ViewModel communication
- Inject event emitter as a dependency
- Pattern:
```javascript
class SlideViewModel {
  constructor(slideService, displayService, eventBus) {
    this.eventBus = eventBus;
  }
  
  async importFromZIP() {
    // ... import logic
    this.eventBus.emit('service-imported', serviceStructure);
  }
}
```

**Priority**: Medium  
**Estimated Effort**: 4-6 hours  
**Blocking**: No

---

### 2. Alert() in SetlistViewModel
**Location**: `harmonysync/src/viewmodels/SetlistViewModel.js:387`  
**Issue**: Using `alert()` directly violates separation of concerns  
**Current Code**:
```javascript
alert(`Failed to open lyrics file: ${error.message}`);
```

**Impact**:
- Couples ViewModel to browser alert API
- Poor user experience (blocks UI)
- Cannot be tested properly
- Violates MVVM pattern

**Proposed Solution**:
- Use observable error state
- Let View display errors via proper modal/notification
- Pattern:
```javascript
// ViewModel
this.error = error.message;
this.showErrorModal = true;

// View
{viewModel.showErrorModal && (
  <ErrorModal 
    message={viewModel.error} 
    onClose={() => viewModel.clearError()} 
  />
)}
```

**Priority**: High  
**Estimated Effort**: 2-3 hours  
**Blocking**: No (temporary alert is functional)

---

### 3. Direct ElectronAPI Access in FileService
**Location**: `harmonysync/src/services/FileService.js:29`  
**Issue**: Direct access to `window.electronAPI` creates environment coupling  
**Current Code**:
```javascript
const { dialog } = window.electronAPI || {};
```

**Impact**:
- Tight coupling to Electron environment
- Inconsistent with IpcService pattern
- Harder to test
- Cannot easily switch IPC layers

**Proposed Solution**:
- Add `selectFolders` method to IpcService
- Use consistent IPC abstraction pattern
- Pattern:
```javascript
// IpcService
async selectFolders() {
  return this.invoke('dialog:selectFolders');
}

// FileService
async selectFolders() {
  return await this.ipc.selectFolders();
}
```

**Priority**: Medium  
**Estimated Effort**: 2-3 hours  
**Blocking**: No

---

### 4. ID Generation in SetlistService
**Location**: `harmonysync/src/services/SetlistService.js:38`  
**Issue**: Using `Date.now() + Math.random()` for ID generation  
**Current Code**:
```javascript
id: `setlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
```

**Impact**:
- Not guaranteed to be unique (though collision is unlikely)
- Not cryptographically secure
- Not suitable for distributed systems
- Could cause issues in high-frequency scenarios

**Proposed Solution**:
- Use `crypto.randomUUID()` (built into modern browsers)
- Or install `uuid` package
- Pattern:
```javascript
// Using built-in crypto
id: `setlist-${crypto.randomUUID()}`

// Or using uuid package
import { v4 as uuidv4 } from 'uuid';
id: `setlist-${uuidv4()}`
```

**Priority**: Low  
**Estimated Effort**: 1 hour  
**Blocking**: No (current implementation works for single-user scenarios)

---

## Future Improvements

### 5. Jest Configuration
**Priority**: High  
**Effort**: 2-3 hours  
**Description**: Configure Jest testing framework to run the 187+ tests  
**Benefits**: 
- Verify all tests pass
- Enable CI/CD testing
- Test coverage reports
- Watch mode for development

**Tasks**:
1. Install Jest and Babel dependencies
2. Create `jest.config.js`
3. Add test scripts to `package.json`
4. Configure Babel for JSX/ES6
5. Run tests and verify all pass
6. Set up coverage reporting

---

### 6. TypeScript Migration
**Priority**: Medium  
**Effort**: 20-30 hours  
**Description**: Convert ViewModels and Services to TypeScript  
**Benefits**:
- Type safety
- Better IDE support
- Catch errors at compile time
- Self-documenting code
- Easier refactoring

**Approach**:
1. Start with Services (no dependencies on ViewModels)
2. Convert ViewModels one at a time
3. Add type definitions for MobX observables
4. Add generic types for DI container
5. Configure TypeScript for Tauri/Electron environment

**Files to Convert** (Priority order):
1. Services layer (6 files)
2. DI Container (1 file)
3. ViewModels (5 files)
4. Tests (add type assertions)

---

### 7. EventBus Service
**Priority**: Medium  
**Effort**: 4-6 hours  
**Description**: Create a proper event bus for ViewModel-to-ViewModel communication  
**Benefits**:
- Decouples ViewModels
- Type-safe events (with TypeScript)
- Testable
- Can log/monitor events

**Implementation Options**:
- Custom EventEmitter class
- RxJS Subjects
- MobX observables/reactions

**Recommended**: RxJS for reactive streams
```javascript
class EventBusService {
  constructor() {
    this.subjects = new Map();
  }
  
  emit(event, data) {
    if (!this.subjects.has(event)) {
      this.subjects.set(event, new Subject());
    }
    this.subjects.get(event).next(data);
  }
  
  subscribe(event, handler) {
    if (!this.subjects.has(event)) {
      this.subjects.set(event, new Subject());
    }
    return this.subjects.get(event).subscribe(handler);
  }
}
```

---

### 8. Error Notification System
**Priority**: High  
**Effort**: 6-8 hours  
**Description**: Create a centralized error/notification system  
**Benefits**:
- Consistent error display
- Better UX (toast notifications)
- Queue multiple notifications
- Dismissible, auto-hide
- Different severity levels

**Components**:
1. `NotificationService` - manages notification queue
2. `NotificationViewModel` - observable notification state
3. `NotificationContainer` - React component to display notifications
4. Integration with all ViewModels

**Pattern**:
```javascript
// ViewModel
this.notifications.error('Failed to load file');
this.notifications.success('File saved successfully');

// View auto-displays notification toast
```

---

### 9. ViewModel State Persistence
**Priority**: Low  
**Effort**: 8-10 hours  
**Description**: Persist ViewModel state across app restarts  
**Benefits**:
- Restore user's work
- Better UX
- Resume where left off

**Approach**:
1. Add `serialize()` method to ViewModels
2. Save state on app close
3. Restore state on app open
4. Use IndexedDB or localStorage
5. Handle migration for state changes

**Example**:
```javascript
class AudioViewModel {
  serialize() {
    return {
      tracks: this.tracks,
      currentPosition: this.currentPosition,
      // ... other state
    };
  }
  
  deserialize(state) {
    runInAction(() => {
      this.tracks = state.tracks || [];
      this.currentPosition = state.currentPosition || 0;
      // ... restore state
    });
  }
}
```

---

### 10. Performance Monitoring
**Priority**: Low  
**Effort**: 4-6 hours  
**Description**: Add performance monitoring to ViewModels  
**Benefits**:
- Identify slow operations
- Optimize bottlenecks
- User experience metrics
- Debug production issues

**Implementation**:
1. Create `PerformanceService`
2. Add timing to ViewModel actions
3. Log slow operations
4. Optional: Send to analytics service

**Example**:
```javascript
async loadTracks(path) {
  const start = performance.now();
  try {
    // ... load tracks
  } finally {
    const duration = performance.now() - start;
    this.performance.record('loadTracks', duration);
    if (duration > 1000) {
      console.warn(`loadTracks took ${duration}ms`);
    }
  }
}
```

---

### 11. Undo/Redo System
**Priority**: Low  
**Effort**: 12-16 hours  
**Description**: Add undo/redo capability to ViewModels  
**Benefits**:
- Better UX
- Recoverable mistakes
- Professional feel

**Approach**:
1. Use Command pattern
2. Store command history
3. Implement undo/redo commands
4. Add keyboard shortcuts
5. Optional: Persist history

**Libraries to Consider**:
- `immer` for immutable state
- Custom command pattern implementation

---

### 12. Logging Infrastructure
**Priority**: Medium  
**Effort**: 4-6 hours  
**Description**: Replace console.log/error with proper logging  
**Benefits**:
- Structured logs
- Log levels (debug, info, warn, error)
- Can send to file/server
- Better debugging

**Implementation**:
```javascript
class LoggerService {
  constructor(level = 'info') {
    this.level = level;
  }
  
  debug(message, ...args) { /* ... */ }
  info(message, ...args) { /* ... */ }
  warn(message, ...args) { /* ... */ }
  error(message, ...args) { /* ... */ }
}
```

---

## Component Refactoring Roadmap

### Phase 1: Core Components (Weeks 7-8)
1. ✅ SlideViewModel created
   - TODO: Refactor `SlideManager.jsx` to use ViewModel
2. ✅ DisplayViewModel created
   - TODO: Refactor `DisplaySettings.jsx` to use ViewModel
3. ✅ MixerViewModel created
   - TODO: Refactor `MixerSidebar.jsx` to use ViewModel
4. ✅ AudioViewModel created
   - TODO: Refactor `AudioPlayer.jsx` to use ViewModel
5. ✅ SetlistViewModel created
   - TODO: Refactor `SetlistManager.jsx` to use ViewModel

### Phase 2: Additional Components (Weeks 9-10)
6. Create `ScheduleViewModel`
   - Refactor `ScheduleManager.jsx`
7. Create `LightingViewModel`
   - Refactor `LightingControl.jsx`
8. Create `MediaViewModel`
   - Refactor `MediaPreview.jsx`
9. Create `SettingsViewModel`
   - Refactor settings components
10. Create `AppViewModel`
    - Refactor `App.jsx` for global state

---

## Priority Matrix

| Item | Priority | Effort | Impact | Status |
|------|----------|--------|--------|--------|
| Jest Configuration | High | 2-3h | High | Pending |
| Error Notifications | High | 6-8h | High | Pending |
| Remove alert() | High | 2-3h | Medium | Pending |
| Component Refactoring | High | 40h+ | High | In Progress |
| EventBus Service | Medium | 4-6h | Medium | Pending |
| IpcService Consistency | Medium | 2-3h | Low | Pending |
| Logging Infrastructure | Medium | 4-6h | Medium | Pending |
| TypeScript Migration | Medium | 20-30h | High | Future |
| ID Generation | Low | 1h | Low | Pending |
| Performance Monitoring | Low | 4-6h | Low | Future |
| State Persistence | Low | 8-10h | Medium | Future |
| Undo/Redo | Low | 12-16h | Medium | Future |

---

## Estimated Total Effort

| Phase | Items | Effort | Priority |
|-------|-------|--------|----------|
| Critical Fixes | 3 items | 6-8h | High |
| Infrastructure | 3 items | 12-17h | High/Medium |
| Component Migration | 10 components | 40-60h | High |
| Type Safety | 1 item | 20-30h | Medium |
| Advanced Features | 3 items | 24-32h | Low |
| **TOTAL** | **20 items** | **102-147h** | Mixed |

---

## Recommendation

### Immediate (Next Sprint):
1. Configure Jest and run tests ✅
2. Remove `alert()` and add error notifications ✅
3. Configure EventBus for ViewModel communication ✅

### Short-term (1-2 months):
4. Refactor all 5 components to use ViewModels ✅
5. Add consistent IpcService patterns ✅
6. Implement logging infrastructure ✅

### Medium-term (3-4 months):
7. Migrate to TypeScript ✅
8. Create remaining ViewModels (Schedule, Lighting, Media, Settings, App) ✅
9. Add error notification system ✅

### Long-term (6+ months):
10. Add state persistence ✅
11. Implement undo/redo system ✅
12. Performance monitoring ✅

---

**Document Version**: 1.0  
**Last Updated**: January 26, 2025  
**Status**: All major items identified and prioritized
