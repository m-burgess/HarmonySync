# MVVM Conversion Plan for HarmonySync
## Executive Summary & Action Items

**Date:** $(date +%Y-%m-%d)  
**Project:** HarmonySync Electron Application  
**Goal:** Convert from MVC-like hybrid to clean MVVM architecture  
**Estimated Timeline:** 6 weeks  
**Priority:** High (Technical Debt Reduction)

---

## 📋 Quick Reference

**Documentation Files:**
1. **ARCHITECTURE_ANALYSIS.md** - Detailed analysis of current state
2. **COMPONENT_HIERARCHY.md** - Visual component tree & data flow
3. **MVVM_CONVERSION_PLAN.md** - This file (action items)

---

## 🎯 Problem Statement

HarmonySync currently has:
- ❌ **3,020+ lines** of component code with mixed concerns
- ❌ **42+ useState hooks** scattered across 8 container components
- ❌ **Business logic tightly coupled to UI** (untestable)
- ❌ **Props drilling 3 levels deep** (brittle)
- ❌ **Direct IPC calls from components** (tight coupling)
- ❌ **Multiple sources of truth** for state (sync issues)

**Impact:**
- Hard to test business logic without rendering UI
- Difficult to maintain and extend features
- Bugs from race conditions and state sync issues
- New developers struggle to understand data flow

---

## ✅ Solution: MVVM Architecture

**Model-View-ViewModel** separates:
- **View**: Pure presentation (React components with JSX only)
- **ViewModel**: Presentation logic, observable state, commands
- **Model/Services**: Business logic, domain rules, IPC abstraction

**Benefits:**
- ✅ **76% reduction** in component code (3,020 → 730 lines)
- ✅ **90%+ testable** business logic (ViewModels are plain JS)
- ✅ **Single source of truth** (ViewModel owns state)
- ✅ **Dependency injection** (easy to mock services)
- ✅ **Cleaner code** (< 100 lines per component)

---

## 📊 Architecture Comparison

### **Before (Current)**
```
Component (React)
  ├── useState (local state)
  ├── useEffect (side effects)
  ├── Business logic ❌
  ├── IPC calls ❌
  └── JSX rendering

Issues:
- Hard to test (need to render React)
- Mixed concerns
- Tight coupling
```

### **After (MVVM)**
```
View (React Component)
  ├── Reads from ViewModel
  ├── Triggers ViewModel commands
  └── Pure JSX (< 100 lines) ✅

ViewModel (Plain JS Class)
  ├── Observable state (MobX or custom)
  ├── Commands (business logic) ✅
  ├── Validation
  └── Calls Services

Services (Business Logic)
  ├── Domain logic ✅
  ├── IPC abstraction
  └── Pure functions

Benefits:
- Testable (no React needed)
- Clear separation
- Mockable dependencies
```

---

## 📅 6-Week Implementation Plan

### **Week 1: Foundation & Setup**

**Tasks:**
- [ ] Choose state management library (Recommendation: **MobX**)
  - Alternatives: Custom Observable, Zustand, Jotai
  - Why MobX: Mature, performant, great React integration
- [ ] Create folder structure:
  ```
  src/
  ├── viewmodels/
  ├── services/
  ├── models/
  ├── di/           # Dependency Injection
  └── views/        # Refactored components
  ```
- [ ] Set up dependency injection container
- [ ] Install dependencies:
  ```bash
  npm install mobx mobx-react-lite
  npm install --save-dev @types/node
  ```
- [ ] Write integration test for one critical workflow (e.g., song loading)
- [ ] Document MVVM patterns for team

**Deliverables:**
- ✅ Project structure ready
- ✅ DI container implemented
- ✅ One integration test passing
- ✅ Team onboarded on MVVM principles

---

### **Week 2: Service Layer Abstraction**

**Goal:** Create service interfaces to decouple business logic from IPC

**Tasks:**
- [ ] Create `AudioService` abstraction
  - Methods: `loadTracks()`, `transpose()`, `play()`, `stop()`
  - Wraps IPC calls: `audio:loadTracks`, `audio:transpose`
- [ ] Create `FileService` abstraction
  - Methods: `selectFolder()`, `readFile()`, `writeFile()`, `exists()`
  - Wraps IPC calls: `dialog:openDirectory`, `fs:*`
- [ ] Create `DisplayService` abstraction
  - Methods: `showSlide()`, `clearDisplay()`, `blackScreen()`
  - Wraps IPC calls: `display:*`
- [ ] Create `SlideService` abstraction
  - Methods: `importFromFolder()`, `importFromPDF()`, `importFromZip()`
  - Wraps IPC calls: `slides:*`
- [ ] Register services in DI container

**Example Service:**
```javascript
// services/AudioService.js
export class AudioService {
  constructor(ipcClient) {
    this.ipcClient = ipcClient;
  }
  
  async loadTracks(folderPath) {
    const result = await this.ipcClient.invoke('audio:loadTracks', { 
      path: folderPath 
    });
    return result.tracks;
  }
  
  async transpose(folderPath, semitones) {
    return await this.ipcClient.invoke('audio:transpose', { 
      path: folderPath, 
      semitones 
    });
  }
}
```

**Testing:**
```javascript
// services/__tests__/AudioService.test.js
test('AudioService.loadTracks calls IPC', async () => {
  const mockIPC = { invoke: jest.fn().mockResolvedValue({ tracks: [...] }) };
  const service = new AudioService(mockIPC);
  
  const tracks = await service.loadTracks('/path/to/song');
  
  expect(mockIPC.invoke).toHaveBeenCalledWith('audio:loadTracks', { path: '/path/to/song' });
  expect(tracks).toHaveLength(5);
});
```

**Deliverables:**
- ✅ 5 service abstractions created
- ✅ Services registered in DI container
- ✅ Unit tests for each service
- ✅ No IPC calls remaining in components (in new code)

---

### **Week 3: First ViewModel - SetlistViewModel**

**Goal:** Extract business logic from SetlistManager into SetlistViewModel

**Tasks:**
- [ ] Create `SetlistViewModel` class
  - Observable state: `setlist`, `currentSongIndex`, `autoplayEnabled`, `isLoading`
  - Commands: `addFolder()`, `loadSong()`, `preloadSong()`, `transpose()`
- [ ] Refactor `SetlistManager.jsx` → `SetlistView.jsx`
  - Remove all business logic
  - Remove useState/useEffect hooks
  - Keep only JSX rendering
  - Bind to ViewModel
- [ ] Wire ViewModel in App.jsx via DI
- [ ] Write unit tests for SetlistViewModel
- [ ] Integration test: Add folder → Load song → Transpose

**SetlistViewModel Structure:**
```javascript
// viewmodels/SetlistViewModel.js
import { makeObservable, observable, action, computed } from 'mobx';

export class SetlistViewModel {
  setlist = [];
  currentSongIndex = -1;
  autoplayEnabled = false;
  isLoading = false;
  
  constructor(audioService, fileService) {
    makeObservable(this, {
      setlist: observable,
      currentSongIndex: observable,
      autoplayEnabled: observable,
      isLoading: observable,
      addFolder: action,
      loadSong: action,
      currentSong: computed
    });
    
    this.audioService = audioService;
    this.fileService = fileService;
  }
  
  get currentSong() {
    return this.setlist[this.currentSongIndex] || null;
  }
  
  async addFolder() {
    this.isLoading = true;
    try {
      const folderPath = await this.fileService.selectFolder();
      if (!folderPath) return;
      
      const tracks = await this.audioService.loadTracks(folderPath);
      const folderName = folderPath.split('/').pop();
      
      this.setlist.push({
        id: Date.now(),
        name: folderName,
        path: folderPath,
        tracks: tracks,
        loaded: false
      });
    } catch (error) {
      console.error('Failed to add folder:', error);
    } finally {
      this.isLoading = false;
    }
  }
  
  async loadSong(item) {
    // Business logic here
  }
  
  async transpose(item, semitones) {
    // Business logic here
  }
}
```

**SetlistView (Refactored):**
```javascript
// views/SetlistView.jsx
import { observer } from 'mobx-react-lite';

export const SetlistView = observer(({ viewModel }) => {
  return (
    <div className="setlist-container">
      <button onClick={() => viewModel.addFolder()}>
        Add Folder
      </button>
      
      {viewModel.isLoading && <LoadingSpinner />}
      
      {viewModel.setlist.map(item => (
        <SetlistItem 
          key={item.id}
          item={item}
          onLoad={() => viewModel.loadSong(item)}
          onTranspose={(semitones) => viewModel.transpose(item, semitones)}
        />
      ))}
    </div>
  );
});
```

**Testing:**
```javascript
// viewmodels/__tests__/SetlistViewModel.test.js
test('SetlistViewModel.addFolder adds item to setlist', async () => {
  const mockAudioService = {
    loadTracks: jest.fn().mockResolvedValue([{ name: 'track1.ogg' }])
  };
  const mockFileService = {
    selectFolder: jest.fn().mockResolvedValue('/path/to/song')
  };
  
  const vm = new SetlistViewModel(mockAudioService, mockFileService);
  
  await vm.addFolder();
  
  expect(vm.setlist).toHaveLength(1);
  expect(vm.setlist[0].name).toBe('song');
  expect(mockAudioService.loadTracks).toHaveBeenCalledWith('/path/to/song');
});
```

**Deliverables:**
- ✅ SetlistViewModel fully implemented
- ✅ SetlistView refactored (< 100 lines)
- ✅ 10+ unit tests for ViewModel
- ✅ Integration tests passing
- ✅ No business logic in View

---

### **Week 4: SlideViewModel & AudioViewModel**

**Goal:** Extract logic from SlideManager and MultitrackPlayer

**Tasks:**
- [ ] Create `SlideViewModel`
  - Observable state: `slides`, `selectedSlide`, `thumbnailSize`, `columns`
  - Commands: `importSlides()`, `selectSlide()`, `deleteSlide()`, `reorderSlides()`
- [ ] Refactor `SlideManager.jsx` → `SlideView.jsx`
- [ ] Create `AudioViewModel`
  - Observable state: `tracks`, `isPlaying`, `volume`, `serviceStatus`
  - Commands: `play()`, `stop()`, `setVolume()`, `muteTrack()`
- [ ] Refactor `MultitrackPlayer.jsx` → `AudioView.jsx`
- [ ] Write unit tests for both ViewModels
- [ ] Integration tests

**SlideViewModel Structure:**
```javascript
export class SlideViewModel {
  slides = [];
  selectedSlide = null;
  thumbnailSize = 220;
  columns = 4;
  
  constructor(slideService, displayService) {
    makeObservable(this, {
      slides: observable,
      selectedSlide: observable,
      thumbnailSize: observable,
      columns: observable,
      importSlides: action,
      selectSlide: action,
      deleteSlide: action
    });
    
    this.slideService = slideService;
    this.displayService = displayService;
  }
  
  async importSlides(source) {
    const imported = await this.slideService.importFromFolder(source);
    this.slides.push(...imported);
  }
  
  selectSlide(slide) {
    this.selectedSlide = slide;
    this.displayService.showSlide(slide);
  }
  
  deleteSlide(slide) {
    const index = this.slides.indexOf(slide);
    if (index !== -1) {
      this.slides.splice(index, 1);
    }
  }
}
```

**Deliverables:**
- ✅ SlideViewModel + SlideView refactored
- ✅ AudioViewModel + AudioView refactored
- ✅ 20+ unit tests
- ✅ Integration tests passing

---

### **Week 5: DisplayViewModel & MixerViewModel**

**Goal:** Complete ViewModel extraction for remaining components

**Tasks:**
- [ ] Create `DisplayViewModel`
  - Observable state: `displayConfigs`, `audienceFontSettings`, `confidenceFontSettings`
  - Commands: `createDisplay()`, `updateDisplay()`, `deleteDisplay()`, `saveFontSettings()`
- [ ] Refactor `DisplaySettings.jsx` → `DisplaySettingsView.jsx`
- [ ] Create `MixerViewModel`
  - Observable state: `tracks`, `muteStates`, `isPlaying`
  - Commands: `toggleMute()`, `play()`, `stop()`
- [ ] Refactor `MixerSidebar.jsx` → `MixerView.jsx`
- [ ] Refactor `App.jsx` - remove business logic, simplify
- [ ] Write unit tests
- [ ] Integration tests

**Deliverables:**
- ✅ All ViewModels created
- ✅ All Views refactored (< 100 lines each)
- ✅ 30+ unit tests total
- ✅ App.jsx simplified (< 150 lines)

---

### **Week 6: Testing, Documentation, & Cleanup**

**Goal:** Ensure quality, performance, and maintainability

**Tasks:**
- [ ] **Testing:**
  - [ ] Achieve 80%+ code coverage on ViewModels
  - [ ] Write integration tests for all critical workflows:
    - Song loading & playback
    - Slide display & navigation
    - Audio transposition
    - Display configuration
  - [ ] Performance testing (memory leaks, render performance)
  - [ ] Cross-browser testing (Electron versions)

- [ ] **Documentation:**
  - [ ] Update README with MVVM architecture
  - [ ] Write "Contributing Guide" for new developers
  - [ ] Add JSDoc comments to ViewModels
  - [ ] Create architecture diagrams (Mermaid)
  - [ ] Document testing patterns

- [ ] **Code Cleanup:**
  - [ ] Remove old commented code
  - [ ] Remove unused imports
  - [ ] Standardize naming conventions
  - [ ] Run ESLint and fix warnings
  - [ ] Remove console.logs (replace with logger)

- [ ] **Performance:**
  - [ ] Profile React renders (React DevTools)
  - [ ] Optimize MobX reactions
  - [ ] Audit bundle size
  - [ ] Lazy load heavy components

**Deliverables:**
- ✅ 80%+ test coverage
- ✅ All integration tests passing
- ✅ Documentation updated
- ✅ Code quality metrics improved
- ✅ Performance baseline established

---

## 🛠️ Technology Stack

### **State Management: MobX (Recommended)**

**Why MobX:**
- ✅ Minimal boilerplate
- ✅ Automatic dependency tracking
- ✅ Great React integration (`mobx-react-lite`)
- ✅ Performance optimizations built-in
- ✅ Observable objects (mutable state)

**Installation:**
```bash
npm install mobx mobx-react-lite
```

**Basic Usage:**
```javascript
import { makeObservable, observable, action } from 'mobx';
import { observer } from 'mobx-react-lite';

class MyViewModel {
  count = 0;
  
  constructor() {
    makeObservable(this, {
      count: observable,
      increment: action
    });
  }
  
  increment() {
    this.count++;
  }
}

const MyView = observer(({ viewModel }) => (
  <div>
    <p>Count: {viewModel.count}</p>
    <button onClick={() => viewModel.increment()}>+1</button>
  </div>
));
```

### **Dependency Injection: Custom Container**

**Why not InversifyJS:**
- ❌ Heavy (70KB)
- ❌ Requires TypeScript decorators
- ❌ Overkill for this project

**Custom Container (Lightweight):**
```javascript
// di/container.js
export class DIContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }
  
  register(name, factory, options = {}) {
    this.services.set(name, { factory, options });
  }
  
  resolve(name) {
    const service = this.services.get(name);
    if (!service) throw new Error(`Service ${name} not registered`);
    
    // Singleton pattern
    if (service.options.singleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, service.factory(this));
      }
      return this.singletons.get(name);
    }
    
    // Transient (new instance each time)
    return service.factory(this);
  }
}

// Usage
const container = new DIContainer();

// Register services
container.register('ipcClient', () => window.electronAPI, { singleton: true });
container.register('audioService', (c) => new AudioService(c.resolve('ipcClient')), { singleton: true });

// Register ViewModels
container.register('setlistViewModel', (c) => 
  new SetlistViewModel(c.resolve('audioService'), c.resolve('fileService'))
);

// Resolve in React
const App = () => {
  const setlistVM = container.resolve('setlistViewModel');
  return <SetlistView viewModel={setlistVM} />;
};
```

---

## 📝 Testing Strategy

### **Unit Tests (ViewModels)**

**Goal:** Test business logic in isolation

```javascript
// viewmodels/__tests__/SetlistViewModel.test.js
describe('SetlistViewModel', () => {
  let vm;
  let mockAudioService;
  let mockFileService;
  
  beforeEach(() => {
    mockAudioService = {
      loadTracks: jest.fn().mockResolvedValue([...])
    };
    mockFileService = {
      selectFolder: jest.fn().mockResolvedValue('/path')
    };
    
    vm = new SetlistViewModel(mockAudioService, mockFileService);
  });
  
  test('addFolder adds item to setlist', async () => {
    await vm.addFolder();
    
    expect(vm.setlist).toHaveLength(1);
    expect(mockAudioService.loadTracks).toHaveBeenCalled();
  });
  
  test('loadSong updates currentSongIndex', async () => {
    vm.setlist = [{ id: 1, name: 'Song 1' }];
    
    await vm.loadSong(vm.setlist[0]);
    
    expect(vm.currentSongIndex).toBe(0);
  });
  
  test('transpose updates tracks', async () => {
    // ... test implementation
  });
});
```

**Coverage Goal:** 80%+ for ViewModels

### **Integration Tests (Workflows)**

**Goal:** Test end-to-end user workflows

```javascript
// __tests__/integration/song-loading.test.js
describe('Song Loading Workflow', () => {
  let container;
  let setlistVM;
  
  beforeEach(() => {
    container = setupDIContainer();
    setlistVM = container.resolve('setlistViewModel');
  });
  
  test('User can add folder, load song, and transpose', async () => {
    // 1. Add folder
    await setlistVM.addFolder();
    expect(setlistVM.setlist).toHaveLength(1);
    
    // 2. Load song
    const song = setlistVM.setlist[0];
    await setlistVM.loadSong(song);
    expect(setlistVM.currentSong).toEqual(song);
    
    // 3. Transpose
    await setlistVM.transpose(song, -2);
    expect(song.tracks[0].transposed).toBe(true);
  });
});
```

### **Component Tests (Views)**

**Goal:** Test UI rendering (no logic)

```javascript
// views/__tests__/SetlistView.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SetlistView } from '../SetlistView';

test('SetlistView renders setlist items', () => {
  const mockVM = {
    setlist: [
      { id: 1, name: 'Song 1', loaded: false },
      { id: 2, name: 'Song 2', loaded: true }
    ],
    isLoading: false,
    addFolder: jest.fn()
  };
  
  render(<SetlistView viewModel={mockVM} />);
  
  expect(screen.getByText('Song 1')).toBeInTheDocument();
  expect(screen.getByText('Song 2')).toBeInTheDocument();
});

test('SetlistView calls addFolder on button click', () => {
  const mockVM = {
    setlist: [],
    isLoading: false,
    addFolder: jest.fn()
  };
  
  render(<SetlistView viewModel={mockVM} />);
  
  fireEvent.click(screen.getByText('Add Folder'));
  
  expect(mockVM.addFolder).toHaveBeenCalledTimes(1);
});
```

---

## 🚨 Risk Mitigation

### **Risk 1: Breaking Existing Functionality**

**Mitigation:**
- ✅ Write integration tests BEFORE refactoring
- ✅ Refactor incrementally (one component at a time)
- ✅ Keep old components alongside new ones during transition
- ✅ Feature flags for gradual rollout

### **Risk 2: Team Learning Curve**

**Mitigation:**
- ✅ Provide MVVM training session
- ✅ Document patterns with examples
- ✅ Code reviews focus on architecture
- ✅ Pair programming for first few components

### **Risk 3: Performance Regression**

**Mitigation:**
- ✅ Establish performance baseline (current)
- ✅ Monitor render counts (React DevTools)
- ✅ Use MobX reactions judiciously
- ✅ Profile before/after each refactor

### **Risk 4: State Management Bugs**

**Mitigation:**
- ✅ Extensive unit tests for ViewModels
- ✅ MobX strict mode in development
- ✅ Single source of truth (ViewModel)
- ✅ No direct state mutation (use actions)

---

## ✅ Success Criteria

**After MVVM conversion, we should achieve:**

### **Code Quality**
- ✅ All components < 100 lines
- ✅ Zero business logic in View components
- ✅ 80%+ test coverage on ViewModels
- ✅ ESLint warnings = 0

### **Architecture**
- ✅ Clear separation: View → ViewModel → Service → Backend
- ✅ Dependency injection for all services
- ✅ Observable state management (MobX)
- ✅ No direct IPC calls from Views

### **Testing**
- ✅ Business logic testable without React
- ✅ 50+ unit tests (ViewModels + Services)
- ✅ 10+ integration tests (workflows)
- ✅ All critical paths tested

### **Performance**
- ✅ No performance regression
- ✅ Memory usage stable
- ✅ Render counts optimized (< 5 per interaction)

### **Documentation**
- ✅ Architecture diagrams updated
- ✅ Contributing guide for new devs
- ✅ All ViewModels have JSDoc comments
- ✅ Testing patterns documented

---

## 📞 Support & Resources

### **MobX Documentation**
- Official: https://mobx.js.org/
- React Integration: https://mobx.js.org/react-integration.html
- Best Practices: https://mobx.js.org/best-practices.html

### **MVVM Patterns**
- [MVVM in JavaScript](https://addyosmani.com/blog/understanding-mvvm-a-guide-for-javascript-developers/)
- [Clean Architecture (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

### **Testing**
- Jest: https://jestjs.io/
- React Testing Library: https://testing-library.com/react
- MobX Testing: https://mobx.js.org/best-practices.html#testing

---

## 🎉 Conclusion

Converting HarmonySync to MVVM architecture will:
- ✅ Reduce component code by 76% (3,020 → 730 lines)
- ✅ Make 90%+ of business logic testable
- ✅ Improve maintainability and extensibility
- ✅ Enable faster feature development
- ✅ Reduce bugs from tight coupling

**Estimated Effort:** 6 weeks (1 developer)  
**Risk Level:** Medium (mitigated with incremental approach)  
**Benefit:** High (2-3x productivity improvement)

**Next Steps:**
1. Review this plan with team
2. Get approval for 6-week timeline
3. Start Week 1 tasks (foundation setup)
4. Schedule daily standups to track progress

---

**Let's build a better HarmonySync! 🚀**
