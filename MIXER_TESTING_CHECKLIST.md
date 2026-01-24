# 🧪 Mixer UX Testing Checklist

## Pre-Testing Setup

- [ ] Audio service is installed (`harmonysync-audio-service`)
- [ ] Node.js dependencies installed (`npm install`)
- [ ] Frontend rebuilt (`npm run build` in harmonysync folder)
- [ ] Test audio files available (various formats)
- [ ] Multiple songs ready to test

---

## 1. Backend Testing

### Track State API
- [ ] **Test:** Load a track via API
  ```bash
  curl -X POST http://localhost:3001/api/tracks/load \
    -H "Content-Type: application/json" \
    -d '{"filePath": "/path/to/track.mp3"}'
  ```
- [ ] **Verify:** Response includes `filePath` in track object
- [ ] **Verify:** Response includes `name` (without extension)

### Mixer State
- [ ] **Test:** Get mixer state
  ```bash
  curl http://localhost:3001/api/mixer/state
  ```
- [ ] **Verify:** All tracks have `filePath` property
- [ ] **Verify:** Track names are correct
- [ ] **Verify:** State includes mute/pan values

---

## 2. Frontend Component Testing

### Empty State
- [ ] **Test:** Open app with no tracks loaded
- [ ] **Verify:** Empty state message displays
- [ ] **Verify:** 🎵 icon visible
- [ ] **Verify:** Instructions are clear
- [ ] **Verify:** Tip section shows helpful guidance

### Loading State
- [ ] **Test:** Select a song to load
- [ ] **Verify:** Loading spinner appears
- [ ] **Verify:** "Loading tracks..." message shows
- [ ] **Verify:** Spinner disappears when loaded

### Loaded State
- [ ] **Test:** Load a song with 5+ tracks
- [ ] **Verify:** All tracks display in grid
- [ ] **Verify:** Track count shows correct number
- [ ] **Verify:** Inline tip is visible above grid
- [ ] **Verify:** Grid is scrollable if many tracks

---

## 3. Track Card Display Testing

### Track Names
- [ ] **Test:** Load various audio files
- [ ] **Verify:** Track names display correctly (no .mp3, .wav, etc.)
- [ ] **Verify:** Underscores replaced with spaces
- [ ] **Verify:** Long names truncate with "..."
- [ ] **Verify:** Hover tooltip shows full name

### Visual Elements
- [ ] **Test:** Active track card
  - [ ] Gray gradient background
  - [ ] 🔊 speaker icon visible
  - [ ] Icon pulses gently
  - [ ] Text is readable (#e0e0e0)
  
- [ ] **Test:** Muted track card
  - [ ] Red gradient background
  - [ ] 🔇 mute icon visible
  - [ ] Card appears dimmed (50% opacity)
  - [ ] Text is grayed out

### Hover Effects
- [ ] **Test:** Hover over track card
  - [ ] Blue border appears (#0078d4)
  - [ ] Card lifts slightly (translateY)
  - [ ] Box shadow appears
  - [ ] Cursor changes to pointer
  - [ ] Smooth transition (0.2s)

---

## 4. Interaction Testing

### Mute Toggle
- [ ] **Test:** Click track name button
  - [ ] Icon changes: 🔊 → 🔇
  - [ ] Background changes: gray → red
  - [ ] Audio stops (or mutes) in real-time
  - [ ] State persists on re-render
  
- [ ] **Test:** Click again to unmute
  - [ ] Icon changes: 🔇 → 🔊
  - [ ] Background changes: red → gray
  - [ ] Audio resumes (if playing)
  - [ ] Card returns to normal opacity

### Pan Control
- [ ] **Test:** Drag pan slider left
  - [ ] Slider moves smoothly
  - [ ] Audio pans to left speaker
  - [ ] Value updates in real-time
  
- [ ] **Test:** Drag pan slider right
  - [ ] Slider moves smoothly
  - [ ] Audio pans to right speaker
  - [ ] Value updates in real-time
  
- [ ] **Test:** Pan on muted track
  - [ ] Pan control is disabled (if design specifies)
  - [ ] OR works but with visual indication

### Multiple Tracks
- [ ] **Test:** Toggle mute on multiple tracks
  - [ ] Each updates independently
  - [ ] No lag or jank
  - [ ] States maintained correctly

---

## 5. Responsive Design Testing

### Desktop (> 1024px)
- [ ] **Verify:** 6 columns of tracks
- [ ] **Verify:** Cards are 160px wide
- [ ] **Verify:** Spacing is 12px (gap-3)
- [ ] **Verify:** All elements fit well
- [ ] **Verify:** Hover effects work smoothly

### Tablet (768-1024px)
- [ ] **Verify:** 4 columns of tracks
- [ ] **Verify:** Cards are 140px wide
- [ ] **Verify:** Layout is balanced
- [ ] **Verify:** Touch targets are adequate

### Mobile (< 768px)
- [ ] **Verify:** 2 columns of tracks
- [ ] **Verify:** Cards are 120px wide
- [ ] **Verify:** Buttons are touch-friendly (48px)
- [ ] **Verify:** Pan controls are usable
- [ ] **Verify:** No horizontal scroll needed

---

## 6. Audio Service Integration

### Service Connection
- [ ] **Test:** Start app with service offline
  - [ ] Red error banner displays
  - [ ] Error message is clear
  - [ ] "Start Audio Service" button visible
  - [ ] Manual instructions shown
  
- [ ] **Test:** Click "Start Audio Service"
  - [ ] Service starts (or attempts to)
  - [ ] Loading indicator shows
  - [ ] Success message appears
  - [ ] Banner disappears when connected
  
- [ ] **Test:** Service crashes mid-use
  - [ ] Error banner reappears
  - [ ] Tracks remain in UI
  - [ ] User can restart service

### Real-time Updates
- [ ] **Test:** Play tracks
  - [ ] Playback state updates in UI
  - [ ] Icons reflect playing state
  
- [ ] **Test:** Stop tracks
  - [ ] State updates immediately
  - [ ] UI reflects stopped state

---

## 7. Tooltip Testing

### Track Name Tooltip
- [ ] **Test:** Hover over track button
  - [ ] Tooltip appears after brief delay
  - [ ] Shows full track name
  - [ ] Shows action hint ("Click to mute...")
  - [ ] Multi-line format is readable
  - [ ] Disappears on mouse out

### Other Elements
- [ ] **Test:** Hover over control buttons
  - [ ] Tooltips appear where expected
  - [ ] Text is helpful and clear
  - [ ] No overlapping tooltips

---

## 8. Animation Testing

### Pulse Animation (Active Icon)
- [ ] **Test:** Watch active track icon
  - [ ] Pulses smoothly (2s duration)
  - [ ] Opacity changes: 1.0 → 0.7 → 1.0
  - [ ] Loops infinitely
  - [ ] No performance impact

### Hover Lift
- [ ] **Test:** Hover multiple times
  - [ ] Smooth transition (0.2s ease)
  - [ ] Lifts 2px (translateY)
  - [ ] Returns to original position
  - [ ] No layout shift

### Click Press
- [ ] **Test:** Click and hold
  - [ ] Button scales down (0.98)
  - [ ] Quick transition (0.1s)
  - [ ] Returns on release
  - [ ] Feels responsive

---

## 9. Accessibility Testing

### Keyboard Navigation
- [ ] **Test:** Tab through mixer controls
  - [ ] Track buttons receive focus
  - [ ] Focus indicator is visible
  - [ ] Tab order is logical
  - [ ] Enter/Space activates buttons

### Screen Reader
- [ ] **Test:** Use screen reader (NVDA/JAWS)
  - [ ] Track names are announced
  - [ ] Button roles are correct
  - [ ] Mute state is announced
  - [ ] Instructions are readable

### Color Contrast
- [ ] **Test:** Check contrast ratios
  - [ ] Text on background: ≥7:1 (AAA)
  - [ ] Active state: clearly visible
  - [ ] Muted state: distinguishable
  - [ ] Hover state: noticeable

### Touch Targets
- [ ] **Test:** Use with touchscreen
  - [ ] Buttons are easy to tap (≥48px)
  - [ ] No accidental taps
  - [ ] Hover effects work (if applicable)

---

## 10. Error Handling Testing

### Invalid Track Data
- [ ] **Test:** Load corrupted file
  - [ ] Error message displays
  - [ ] Track doesn't appear in list
  - [ ] Other tracks load normally
  - [ ] UI remains stable

### Backend Errors
- [ ] **Test:** Simulate API failure
  - [ ] Graceful degradation
  - [ ] Error message to user
  - [ ] Recovery instructions
  - [ ] Retry mechanism available

### State Sync Issues
- [ ] **Test:** Disconnect WebSocket
  - [ ] UI shows disconnected state
  - [ ] Reconnection attempted
  - [ ] State syncs on reconnect

---

## 11. Performance Testing

### Many Tracks
- [ ] **Test:** Load 20+ tracks
  - [ ] All render without lag
  - [ ] Scrolling is smooth
  - [ ] Interactions remain responsive
  - [ ] Memory usage reasonable

### Rapid Interactions
- [ ] **Test:** Quickly mute/unmute multiple tracks
  - [ ] UI updates without delay
  - [ ] No visual glitches
  - [ ] Audio responds correctly
  - [ ] State stays consistent

### Animation Performance
- [ ] **Test:** Monitor frame rate
  - [ ] Animations at 60fps
  - [ ] No dropped frames on scroll
  - [ ] Hover effects don't lag
  - [ ] CPU usage is reasonable

---

## 12. Cross-Browser Testing

### Chrome/Edge (Chromium)
- [ ] All features work correctly
- [ ] Animations are smooth
- [ ] Layout is correct
- [ ] No console errors

### Firefox
- [ ] All features work correctly
- [ ] Gradients display properly
- [ ] Tooltips work correctly
- [ ] No console errors

### Safari
- [ ] All features work correctly
- [ ] Webkit prefixes work
- [ ] Touch events on mobile
- [ ] No console errors

---

## 13. Integration Testing

### With Setlist
- [ ] **Test:** Select song from setlist
  - [ ] Tracks load correctly
  - [ ] Previous tracks are cleared
  - [ ] Smooth transition
  - [ ] Track count updates

### With Transport Controls
- [ ] **Test:** Play/Stop buttons
  - [ ] Mixer reflects playback state
  - [ ] Muted tracks stay muted
  - [ ] Pan settings persist
  - [ ] No sync issues

### With Transpose
- [ ] **Test:** Transpose tracks up/down
  - [ ] New tracks load
  - [ ] Track names update
  - [ ] UI refreshes properly
  - [ ] Directory path updates

---

## 14. User Experience Testing

### First-Time User
- [ ] Can understand empty state
- [ ] Knows how to load tracks
- [ ] Recognizes interactive elements
- [ ] Can mute/unmute without help
- [ ] Finds pan controls intuitive

### Experienced User
- [ ] Can quickly mute multiple tracks
- [ ] Workflow is efficient
- [ ] No unnecessary clicks
- [ ] Visual feedback is sufficient
- [ ] Keyboard shortcuts (if any) work

### Volunteer Scenario
- [ ] Loads song before service
- [ ] Mutes click track
- [ ] Adjusts pan for monitors
- [ ] Plays tracks during service
- [ ] No confusion or errors

---

## 15. Edge Cases

### No Audio Files
- [ ] Empty state shows correctly
- [ ] No errors in console
- [ ] Instructions are helpful

### One Track Only
- [ ] Layout looks good
- [ ] Track displays properly
- [ ] No layout issues

### Very Long Track Names
- [ ] Names truncate correctly
- [ ] Tooltip shows full name
- [ ] No overflow issues

### Special Characters in Names
- [ ] Emojis display correctly
- [ ] Unicode characters work
- [ ] Symbols don't break layout

---

## 16. Documentation Testing

### For Volunteers
- [ ] VOLUNTEER_MIXER_GUIDE.md is clear
- [ ] All screenshots/diagrams accurate
- [ ] Examples are helpful
- [ ] Troubleshooting covers common issues

### For Developers
- [ ] MIXER_UX_IMPROVEMENTS.md is complete
- [ ] MIXER_ARCHITECTURE.md is accurate
- [ ] Code comments are helpful
- [ ] API documentation matches implementation

---

## Test Summary Template

```
Date: _______________
Tester: _____________
Environment: ________

✅ Passed: ___ / ___
⚠️  Warnings: ______
❌ Failed: _________

Critical Issues:
1. 
2. 
3. 

Minor Issues:
1. 
2. 
3. 

Notes:


Recommendations:


Sign-off: ___________
```

---

## Automated Testing (Future)

### Unit Tests
- [ ] TrackControlCard component
- [ ] Track name formatting
- [ ] Tooltip rendering
- [ ] State management

### Integration Tests
- [ ] Track loading flow
- [ ] Mute toggle flow
- [ ] Pan control flow
- [ ] Service integration

### E2E Tests
- [ ] Complete user journey
- [ ] Error recovery
- [ ] Multi-track scenarios
- [ ] Responsive behavior

---

## Sign-off

When all items are checked:

- [ ] All critical tests passed
- [ ] Minor issues documented
- [ ] Performance is acceptable
- [ ] Documentation is complete
- [ ] Ready for production

**Tester Signature:** _____________________  
**Date:** _____________________  
**Version:** _____________________

---

*Use this checklist before each release to ensure quality!*
