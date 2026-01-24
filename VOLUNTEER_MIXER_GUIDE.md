# 🎵 Audio Mixer Quick Reference for Volunteers

## At a Glance

### Track Card Layout
```
┌───────────────────┐
│  🔊 Track Name    │  ← Click to mute/unmute
│                   │
│   L  ◄──●──►  R  │  ← Pan left/right
└───────────────────┘
```

## Icons & What They Mean

| Icon | Meaning |
|------|---------|
| 🔊 | Track is **ACTIVE** (playing) |
| 🔇 | Track is **MUTED** (silent) |

## Quick Actions

### Mute/Unmute a Track
1. Click the track name button
2. Icon changes: 🔊 → 🔇 (or reverse)
3. Color changes: Gray → Red (or reverse)

### Adjust Pan (Left/Right Balance)
1. Drag the circle below the track name
2. **Left (L)** = sound from left speaker
3. **Right (R)** = sound from right speaker
4. **Center (●)** = balanced stereo

## Visual Cues

### Track is Active
- Gray background
- 🔊 speaker icon
- Icon pulses gently

### Track is Muted
- Red background
- 🔇 mute icon
- Card appears dimmed

### Hovering Over a Track
- Blue border appears
- Card lifts slightly
- Tooltip shows full track name

## Common Tasks

### ✅ Mute the Click Track
1. Find track named "Click" or "Metronome"
2. Click the track name
3. Verify 🔇 icon appears

### ✅ Solo a Vocalist
1. Mute all other tracks
2. Leave only vocal track active (🔊)

### ✅ Adjust Monitor Mix
1. Pan tracks as needed:
   - Click/Guide tracks → usually LEFT
   - Music tracks → usually RIGHT or CENTER
2. Drag pan controls to desired position

### ✅ Quick Reset
1. Use "Stop All" button (top of mixer)
2. Reload the song from setlist

## Troubleshooting

### 😕 I don't see any tracks
**Solution:** Select a song from the setlist on the left

### 😕 Tracks don't show names
**Solution:** Restart the audio service (red banner at top)

### 😕 No sound from a track
**Check:**
- Is the track muted? (🔇 icon means muted)
- Is master volume up? (slider at top)
- Are headphones/speakers connected?

### 😕 Audio service error
**Solution:**
1. Click "Start Audio Service" in the red banner
2. Or manually run in terminal:
   ```
   cd harmonysync-audio-service
   ./start-service.sh start
   ```

## Best Practices 💡

### During Rehearsal
- Test all tracks individually
- Set pan positions for monitors
- Save mixer settings if available

### During Service
- **Minimize clicking** (plan ahead)
- Use mute sparingly
- Monitor the track count indicator

### After Service
- Reset mixer to default state
- Document any issues for tech team
- Report missing or corrupt tracks

## Keyboard Tips (Future)
*Note: These may be added in future updates*

- **Space** = Play/Pause all
- **M** = Mute selected track
- **Arrow Keys** = Navigate tracks

## Layout Reference

### Mobile View (Phone)
- 2 columns
- Smaller cards
- Vertical scrolling

### Tablet View
- 4 columns
- Medium cards
- Better spacing

### Desktop View
- 6 columns
- Full-size cards
- Optimal for quick access

## Getting Help

### In the App
- Hover over any element for tooltip
- Look for 💡 tip indicators
- Check empty state messages

### Contact Tech Team
- Report bugs or issues
- Request features
- Ask for training

## Remember! 🎯

1. **Track Name = Mute Button**
   - Just click it!

2. **Icons Tell the Story**
   - 🔊 = on, 🔇 = off

3. **Hover for Help**
   - Tooltips explain everything

4. **Blue Border = Interactive**
   - Anything with blue on hover is clickable

5. **Pan is Optional**
   - Center works fine for most uses

---

## Quick Checklist Before Service

- [ ] Audio service is running (green indicator)
- [ ] Song is loaded (tracks visible)
- [ ] Click track is muted (if not needed)
- [ ] Pan positions are set for monitors
- [ ] Master volume is appropriate
- [ ] Test playback works

## Quick Checklist After Service

- [ ] Stop all audio
- [ ] Clear loaded tracks (if needed)
- [ ] Close the app properly
- [ ] Report any issues to tech lead

---

**Version:** 1.0  
**Last Updated:** January 2026  
**For:** Volunteer Audio Operators

**Questions?** Hover over elements for tooltips or ask the tech team!
