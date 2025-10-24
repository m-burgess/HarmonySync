# DMX Lighting Control - Quick Start Guide

## 5-Minute Setup

**Goal:** Get your first DMX lighting scene working in 5 minutes.

---

## What You Need

### Hardware
- ✅ USB DMX interface (ENTTEC DMX USB PRO or compatible)
- ✅ DMX lighting fixtures (LED pars, dimmer pack, etc.)
- ✅ XLR cables (3-pin or 5-pin depending on fixtures)
- ✅ Computer running HarmonySync

### Knowledge
- Basic understanding of your lighting fixtures
- DMX addresses configured on your fixtures
- USB drivers installed (usually automatic)

---

## Step 1: Connect Your Hardware (1 minute)

```
Computer → USB Cable → DMX Interface → XLR Cable → First Fixture → XLR Cable → Second Fixture → ... → Last Fixture → Terminator (optional but recommended)
```

**Tips:**
- Daisy-chain fixtures using XLR cables
- Use DMX terminator on last fixture for long cable runs
- Keep cables under 1000 feet total length

**Example Setup:**
```
Computer (HarmonySync)
    ↓ USB
[DMX Interface]
    ↓ XLR
[Stage Par 1] → [Stage Par 2] → [Stage Par 3] → [Stage Par 4]
```

---

## Step 2: Open DMX Settings (30 seconds)

1. Launch **HarmonySync**
2. Click **Settings** menu → **Lighting Control** (or press `Ctrl+L`)
3. Click **DMX Interface** tab

**You should see:**
```
┌─────────────────────────────────────┐
│  DMX Interface Settings             │
├─────────────────────────────────────┤
│  Interface: [Auto-detect ▼]        │
│  Status: ✓ Connected                │
│  Universe 1: 512 channels available │
└─────────────────────────────────────┘
```

**Troubleshooting:** If no interface detected, see [Troubleshooting](#troubleshooting) section.

---

## Step 3: Add Your First Fixture (1 minute)

1. Click **Fixtures** tab
2. Click **Add Fixture** button
3. Fill out the form:

```
┌─────────────────────────────────────┐
│  Add Fixture                        │
├─────────────────────────────────────┤
│  Fixture Type: [RGB LED Par (6ch) ▼]│
│  Fixture Name: [Stage Par 1]       │
│  DMX Address:  [1]                  │
│  Universe:     [1]                  │
│                                     │
│  [Add Fixture]  [Cancel]           │
└─────────────────────────────────────┘
```

**Important:** DMX address must match the address configured on your physical fixture!

**Example:**
- Fixture 1: Address 1 (uses channels 1-6)
- Fixture 2: Address 7 (uses channels 7-12)
- Fixture 3: Address 13 (uses channels 13-18)

Click **Add Fixture** to save.

**Repeat for each fixture** (or click **Quick Add Multiple** to add several at once).

---

## Step 4: Create Your First Scene (2 minutes)

1. Click **Scenes** tab
2. Click **New Scene** button
3. Give it a name: **"Worship - Blue Purple"**

### Set Fixture Values

For each fixture, adjust the sliders:

```
┌─────────────────────────────────────┐
│  Scene: Worship - Blue Purple       │
├─────────────────────────────────────┤
│  Stage Par 1                        │
│    Red:    [====------] 128         │
│    Green:  [----------] 0           │
│    Blue:   [==========] 255         │
│    Dimmer: [========--] 200         │
│                                     │
│  Stage Par 2                        │
│    Red:    [====------] 128         │
│    Green:  [----------] 0           │
│    Blue:   [==========] 255         │
│    Dimmer: [========--] 200         │
│                                     │
│  Fade Time: [===] 3.0 seconds       │
│                                     │
│  [Test Scene] [Save Scene]         │
└─────────────────────────────────────┘
```

**Tips:**
- **Test Scene** button shows a live preview
- Adjust values while watching your fixtures
- Common colors:
  - **Red:** R=255, G=0, B=0
  - **Blue:** R=0, G=0, B=255
  - **Purple:** R=128, G=0, B=255
  - **White:** R=255, G=255, B=255
  - **Warm White:** R=255, G=200, B=150

Click **Save Scene** when satisfied.

---

## Step 5: Recall Your Scene (30 seconds)

1. Go back to main HarmonySync window
2. You should see a new **Lighting** panel on the left sidebar
3. Click your scene button: **"Worship - Blue Purple"**

**Your lights should change!** 🎉

```
┌─────────────────────────────────────┐
│  Lighting Scenes                    │
├─────────────────────────────────────┤
│  [Worship - Blue Purple] ✓          │
│  [Sermon - Neutral]                 │
│  [Pre-Service - Warm]               │
│  [Blackout]                         │
│                                     │
│  Active: Worship - Blue Purple      │
│  Fade: 3.0 sec                      │
└─────────────────────────────────────┘
```

**Congratulations!** You've set up DMX control in HarmonySync! 🎉

---

## Next Steps

### Create More Scenes

Common scenes for worship:

1. **Pre-Service** (House 50%, stage warm white)
2. **Worship** (House 25%, stage colors)
3. **Sermon** (House 50%, stage neutral)
4. **Post-Service** (House 75%, stage off)
5. **Blackout** (Everything off)

### Automate with Slides

**Link scenes to presentation slides:**

1. Open your presentation in HarmonySync
2. Right-click on a slide
3. Select **"Add Lighting Scene"**
4. Choose your scene from the list

**Now when you click that slide, the lighting changes automatically!**

### Schedule Lighting

**Automate lighting with the Scheduler:**

1. Click **Scheduler** icon (calendar)
2. Add new event
3. Set time (e.g., "Sunday 9:45 AM")
4. Action: **"Recall DMX Scene"**
5. Scene: **"Pre-Service"**

**Your lighting now changes automatically before service starts!**

### MIDI Control

**Trigger scenes with MIDI:**

1. Open **MIDI Settings**
2. Add new MIDI trigger
3. Press a key on your MIDI controller
4. Assign action: **"Recall DMX Scene"**
5. Choose scene

**Now MIDI notes control your lighting!**

---

## Common Fixture Setups

### Simple Church Setup (3 fixtures)

```
Stage:
  - 4× RGB LED Pars (stage wash)
    Addresses: 1, 7, 13, 19

House Lights:
  - 1× Dimmer Pack (4 channels)
    Address: 25
    CH1: Front house
    CH2: Back house
    CH3: Side house
    CH4: TV lights
```

**Total DMX Channels Used:** 28 (out of 512 available)

### Medium Venue Setup (8 fixtures)

```
Stage:
  - 8× RGB LED Pars (stage wash)
    Addresses: 1, 7, 13, 19, 25, 31, 37, 43
  
  - 2× RGBW LED Bars (uplighting)
    Addresses: 50, 58

House:
  - 1× Dimmer Pack (4 channels)
    Address: 70
```

**Total DMX Channels Used:** 82 (out of 512)

### Large Venue Setup (15+ fixtures)

```
Stage:
  - 12× RGB LED Pars (stage wash)
  - 4× RGBW LED Bars (uplighting)
  - 2× Moving Heads (spotlights)

House:
  - 2× Dimmer Packs (8 total channels)

Total: ~150 channels used
```

---

## Example Scenes

### Pre-Service Scene

**Goal:** Welcoming atmosphere, people can see to find seats

```
House Lights:
  - Dimmer: 128 (50%)

Stage Pars (all):
  - Red: 255
  - Green: 200
  - Blue: 150
  - Dimmer: 77 (30%)
  
Result: Warm white stage, moderate house lights
```

### Worship Scene

**Goal:** Focused on stage, dramatic colors

```
House Lights:
  - Dimmer: 64 (25%)

Stage Pars (all):
  - Red: 128
  - Green: 0
  - Blue: 255
  - Dimmer: 200 (78%)

Uplights:
  - Red: 255
  - Green: 0
  - Blue: 128
  - White: 0
  - Dimmer: 180 (70%)

Result: Blue/purple stage, dim house
```

### Sermon Scene

**Goal:** Good visibility, TV lighting for broadcast

```
House Lights:
  - Dimmer: 128 (50%)

TV Lights:
  - Dimmer: 255 (100%)

Stage Pars (all):
  - Red: 255
  - Green: 255
  - Blue: 255
  - Dimmer: 128 (50%)

Result: Neutral white, good for video
```

### Blackout Scene

**Goal:** All lights off

```
All Fixtures:
  - All channels: 0

Fade Time: 1.0 second (quick fade)

Result: Everything off
```

---

## Troubleshooting

### Problem: Interface Not Detected

**Solutions:**
1. Check USB cable is connected
2. Try a different USB port
3. Restart HarmonySync
4. Check Device Manager (Windows) or `lsusb` (Linux)
5. Install FTDI drivers if needed: https://ftdichip.com/drivers/vcp-drivers/

**Still not working?**
- Try a different USB cable
- Check interface power LED is on
- Contact interface manufacturer support

### Problem: Fixtures Not Responding

**Solutions:**
1. **Check DMX addresses** - Must match fixture configuration
2. **Check cables** - Make sure XLR is 3-pin or 5-pin to match fixtures
3. **Check polarity** - DMX uses pins 2 and 3 (sometimes reversed)
4. **Try direct connection** - Connect interface directly to one fixture
5. **Test fixture standalone** - Use fixture's built-in test mode

**Common mistakes:**
- ❌ Wrong DMX address
- ❌ Fixture in "Sound Active" mode (should be DMX mode)
- ❌ Cables plugged into wrong ports (DMX IN vs DMX OUT)
- ❌ Bad cable (common with cheap cables)

### Problem: Flickering Lights

**Solutions:**
1. **Add DMX terminator** - Required for long cable runs
2. **Shorten cable run** - Keep under 1000 feet
3. **Check cable quality** - Use proper DMX cable, not mic cable
4. **Check for interference** - Keep DMX cables away from power cables

### Problem: Only Some Fixtures Work

**Solutions:**
1. **Check addressing** - Look for overlapping addresses
2. **Check cable chain** - Bad cable in middle affects everything after it
3. **Check universe** - Make sure all fixtures are on same universe

---

## Fixture Addressing Examples

### Example 1: 4 RGB LED Pars (6 channels each)

```
Fixture 1: Address 1
  - CH1 (DMX 1): Red
  - CH2 (DMX 2): Green
  - CH3 (DMX 3): Blue
  - CH4 (DMX 4): Dimmer
  - CH5 (DMX 5): Strobe
  - CH6 (DMX 6): Mode

Fixture 2: Address 7
  - CH1 (DMX 7): Red
  - CH2 (DMX 8): Green
  - ... (uses DMX 7-12)

Fixture 3: Address 13 (uses DMX 13-18)
Fixture 4: Address 19 (uses DMX 19-24)
```

**Rule:** Next fixture address = Previous address + Channel count

### Example 2: Mixed Fixtures

```
Stage Par 1: Address 1 (6 channels) → uses DMX 1-6
Stage Par 2: Address 7 (6 channels) → uses DMX 7-12
Moving Head: Address 13 (16 channels) → uses DMX 13-28
Dimmer Pack: Address 29 (4 channels) → uses DMX 29-32
```

---

## Tips and Best Practices

### Naming Conventions

**Good fixture names:**
- ✅ "Stage Left Par 1"
- ✅ "House Front Dimmer"
- ✅ "Uplight Left"

**Bad fixture names:**
- ❌ "Light 1"
- ❌ "Thing"
- ❌ "asdf"

### Scene Naming

**Good scene names:**
- ✅ "Worship - Blue Purple"
- ✅ "Sermon - Neutral White"
- ✅ "Pre-Service - Warm"

**Bad scene names:**
- ❌ "Scene 1"
- ❌ "The one I like"
- ❌ "Test"

### Fade Times

**Recommended fade times:**
- **Quick changes:** 1-2 seconds
- **Normal changes:** 3-5 seconds
- **Dramatic changes:** 5-10 seconds
- **Blackouts:** 1-2 seconds

### Testing

**Before service:**
1. Test all scenes end-to-end
2. Verify automation (slide triggers)
3. Have a backup plan (manual control)
4. Keep a "blackout" scene handy

### Backup

**Protect your work:**
1. Export scenes regularly (Settings → Export)
2. Keep backup on USB drive
3. Document fixture addresses
4. Take photos of fixture configuration

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+L` | Open Lighting Control |
| `Ctrl+Shift+L` | Quick Scene Select |
| `B` | Blackout (when lighting panel focused) |
| `1-9` | Recall scene 1-9 (when lighting panel focused) |
| `Ctrl+S` | Save current scene |

---

## Video Tutorials

**Watch these for visual walkthroughs:**

1. **"DMX in 5 Minutes"** - Quick overview
2. **"Setting Up Your First Fixture"** - Detailed walkthrough
3. **"Creating Worship Scenes"** - Scene programming
4. **"Automating Your Lighting"** - Slide integration

*(Links will be available after feature launch)*

---

## Need More Help?

### Documentation
- **Full Manual:** `DMX_PLUGIN_HOST_RESEARCH.md`
- **Implementation Details:** `DMX_IMPLEMENTATION_SUMMARY.md`
- **Troubleshooting Guide:** `DMX_TROUBLESHOOTING.md` *(coming soon)*

### Support
- **Community Forum:** https://harmonysync.community
- **Discord:** https://discord.gg/harmonysync
- **Email:** support@harmonysync.app

### Professional Setup
If you need help with:
- Large fixture installations
- Custom fixture profiles
- Complex scene programming
- Training for your team

Contact: professional@harmonysync.app

---

## Appendix: Fixture Library

### Included Fixture Profiles

**RGB LED Pars:**
- Generic RGB LED Par (6 channel)
- Generic RGB LED Par (7 channel)
- Chauvet SlimPAR 64 RGB
- American DJ Mega Par Profile

**RGBW LED Pars:**
- Generic RGBW LED Par (8 channel)
- Chauvet COLORdash Par-Quad 7
- American DJ 5PX Hex

**Dimmer Packs:**
- Generic 4-channel dimmer
- Generic 8-channel dimmer
- Chauvet Dimmer Pack
- Elation DP-415

**Moving Heads:**
- Generic Moving Head Spot (16ch)
- Generic Moving Head Wash (18ch)
- Chauvet Intimidator Spot 360

**LED Bars:**
- Generic RGB LED Bar (12ch)
- Generic RGBW LED Bar (16ch)
- Chauvet COLORband Pix USB

### Don't See Your Fixture?

**Request a fixture profile:**
1. Go to Settings → Lighting → Fixture Library
2. Click "Request New Fixture"
3. Provide: Make, model, manual (PDF or link)

**Or create your own:**
1. Click "Custom Fixture"
2. Enter fixture details manually
3. Test and save

---

**You're ready to start using DMX lighting in HarmonySync!** 🎉

**Happy lighting!** 💡✨
