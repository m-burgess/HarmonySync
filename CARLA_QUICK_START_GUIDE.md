# Carla Plugin Host - Quick Start Guide

## Introduction

Welcome to the HarmonySync Carla Plugin Host feature! This guide will help you get started quickly with running audio plugins like AVL Drums, Keyzone Classic, and Tonex for your live worship setup.

## What You Can Do

With the Carla Plugin Host feature, you can:
- ✨ Run professional audio plugins (VST, LV2, AU) inside HarmonySync
- 🎹 Connect MIDI devices (drum kits, keyboards) to specific plugins
- 🎚️ Route plugin audio to specific channels on your audio interface
- 💾 Save and recall complete setups for different services
- 📊 Monitor memory usage in real-time
- 🎵 Use multiple instances of the same plugin

## Quick Setup (5 Minutes)

### Step 1: Install Required Software

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install carla carla-plugins
```

**macOS:**
```bash
brew install carla
```

**Windows:**
Download and install Carla from: https://kx.studio/Applications:Carla

### Step 2: Open Plugin Manager

1. Launch HarmonySync
2. Click the **"Plugins"** button in the left sidebar
3. The Plugin Manager window will open

### Step 3: Add Your First Plugin

1. Click **"+ Add Plugin"** button
2. Navigate to your plugin location:
   - **Linux:** `/usr/lib/vst/` or `/usr/lib/lv2/`
   - **macOS:** `/Library/Audio/Plug-Ins/VST/` or `~/Library/Audio/Plug-Ins/`
   - **Windows:** `C:\Program Files\VstPlugins\` or `C:\Program Files\Steinberg\VstPlugins\`
3. Select a plugin file (`.vst`, `.vst3`, `.lv2`, `.so`, or `.dll`)
4. Click **"Open"**
5. Wait a few seconds for the plugin to load

### Step 4: Connect MIDI Device

1. In the plugin card, locate the **"MIDI Input"** dropdown
2. Select your MIDI device (e.g., "Electric Drum Kit", "MIDI Keyboard")
3. Choose the MIDI channel (usually Channel 10 for drums, Channel 1 for keys)
4. Test by playing your MIDI device - you should hear sound!

### Step 5: Route Audio Output

1. In the plugin card, find **"Audio Output Channels"**
2. Enter the channel numbers you want (e.g., `1,2` for stereo on channels 1-2)
3. For the example setup:
   - **Drums:** `1,2`
   - **Keys:** `3,4`
   - **Guitar 1:** `5`
   - **Guitar 2:** `6`

### Step 6: Save Your Setup

1. Click **"File"** → **"Save Configuration"**
2. Give it a name (e.g., "Sunday Service Setup")
3. Click **"Save"**

That's it! You're ready to perform.

## Common Setups

### Setup 1: Drum Kit + Keyboard

**What You Need:**
- Electric drum kit (USB/MIDI)
- MIDI keyboard (USB/MIDI)
- Audio interface with 4+ outputs

**Plugins:**
1. **AVL Drums** for drum sounds
2. **Keyzone Classic** for piano/keys

**Configuration:**

| Plugin | MIDI Device | MIDI Channel | Audio Out |
|--------|-------------|--------------|-----------|
| AVL Drums | Electric Drum Kit | 10 | 1,2 |
| Keyzone Classic | MIDI Keyboard | 1 | 3,4 |

### Setup 2: Full Band (Drums + Keys + 2 Guitars)

**What You Need:**
- Electric drum kit
- MIDI keyboard
- 2× Guitar inputs
- Audio interface with 6+ outputs (e.g., Behringer X18)

**Plugins:**
1. **AVL Drums** for drums
2. **Keyzone Classic** for keys
3. **Tonex** for guitar 1
4. **Tonex** (second instance) for guitar 2

**Configuration:**

| Plugin | MIDI Device | MIDI Channel | Audio Out |
|--------|-------------|--------------|-----------|
| AVL Drums | Electric Drum Kit | 10 | 1,2 |
| Keyzone Classic | MIDI Keyboard | 1 | 3,4 |
| Tonex 1 | (Audio Input) | - | 5 |
| Tonex 2 | (Audio Input) | - | 6 |

**Memory Usage:** ~1.2 GB (well within 8 GB limit)

### Setup 3: Keyboard Splits (Piano + Organ)

**What You Need:**
- MIDI keyboard with split capability
- Audio interface with 4+ outputs

**Plugins:**
1. **Keyzone Classic** for piano (lower half of keyboard)
2. **Organ Plugin** for organ (upper half of keyboard)

**Configuration:**

| Plugin | MIDI Device | MIDI Channel | Audio Out |
|--------|-------------|--------------|-----------|
| Keyzone Classic | MIDI Keyboard | 1 | 1,2 |
| Organ Plugin | MIDI Keyboard | 2 | 3,4 |

*Note: Configure keyboard split on the keyboard itself to send different channels*

## Memory Management Tips

### Monitoring Memory

The Plugin Manager shows real-time memory usage:
- **Green bar:** < 50% of budget (< 4 GB)
- **Yellow bar:** 50-75% of budget (4-6 GB)
- **Red bar:** > 75% of budget (> 6 GB)

### Staying Under 8 GB

**Do:**
- ✅ Unload plugins you're not using
- ✅ Use sample streaming where available
- ✅ Close other applications during performance
- ✅ Load only necessary presets

**Don't:**
- ❌ Load more than 4-5 heavy sample-based plugins
- ❌ Keep unused plugins loaded "just in case"
- ❌ Run multiple instances of HarmonySync
- ❌ Load every sound in a multi-gigabyte library

### Typical Memory Usage

| Plugin Type | Typical Memory |
|-------------|----------------|
| Synth (wavetable) | 50-100 MB |
| Synth (sample-based) | 100-300 MB |
| Drums (sampled) | 200-500 MB |
| Guitar Amp Sim | 50-100 MB |
| Piano (sampled) | 100-300 MB |

## Audio Interface Setup

### Behringer X18 Example

The X18 has 18 inputs and 18 outputs. Here's how to route plugins:

**Outputs (USB):**
1-2: Drums L/R
3-4: Keys L/R
5: Guitar 1
6: Guitar 2
7-8: Click/backing tracks
9-18: Additional channels

**In X18 Routing:**
1. Open X-Air app
2. Go to Setup → Routing
3. Set USB outputs to match your plugin routing
4. Assign channels to physical outputs or mains

### Buffer Size Recommendations

| Use Case | Buffer Size | Latency |
|----------|-------------|---------|
| Recording | 512-1024 samples | 10-20 ms |
| Live Performance | 128-256 samples | 3-6 ms |
| Mixing | 512-2048 samples | 10-40 ms |

Lower buffer = lower latency but higher CPU usage.

## Troubleshooting

### No Sound from Plugin

**Check:**
1. ✓ Plugin is loaded (shows in plugin list)
2. ✓ MIDI device is connected and selected
3. ✓ Audio routing is set correctly
4. ✓ Volume/gain is not at 0 or muted
5. ✓ Audio interface is selected in system settings

### MIDI Not Working

**Check:**
1. ✓ MIDI device is powered on and connected
2. ✓ Correct MIDI channel is selected
3. ✓ MIDI cable is connected (if using DIN cables)
4. ✓ MIDI device appears in HarmonySync MIDI list
5. ✓ Test MIDI with another application to verify device works

### High CPU Usage / Dropouts

**Solutions:**
1. Increase buffer size (try 512 or 1024)
2. Close other applications
3. Disable plugin features you're not using
4. Reduce polyphony in plugin settings
5. Check for system updates

### Plugin Won't Load

**Possible Reasons:**
1. Plugin file is corrupt or incompatible
2. Missing dependencies (VST bridge, etc.)
3. Plugin is 32-bit on 64-bit system
4. Incorrect file permissions (Linux/macOS)

**Try:**
1. Test plugin in Carla standalone first
2. Update plugin to latest version
3. Check plugin manufacturer's website for requirements
4. Review HarmonySync logs for error messages

### Memory Warning (Yellow/Red)

**Immediate Actions:**
1. Unload unused plugins
2. Close other applications
3. Restart HarmonySync (memory will be released)

**Long-term Solutions:**
1. Use lighter-weight plugins
2. Upgrade to 16 GB RAM
3. Enable sample streaming in plugins
4. Reduce preset count loaded

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Plugin Manager | `Ctrl+P` (TBD) |
| Add Plugin | `Ctrl+O` (TBD) |
| Unload Selected | `Del` (TBD) |
| Save Configuration | `Ctrl+S` (TBD) |
| Load Configuration | `Ctrl+L` (TBD) |

*Note: Shortcuts to be implemented*

## Best Practices

### Before Service

1. Load and test all plugins 30 minutes before
2. Verify all MIDI devices are connected
3. Check audio routing with sound check
4. Save configuration as "Service_[Date]"
5. Have backup configuration ready

### During Service

1. Monitor memory usage periodically
2. Keep CPU usage in view
3. Have preset changes ready before needed
4. Don't load/unload plugins during songs
5. Use saved configurations for quick changes

### After Service

1. Unload all plugins
2. Save any configuration changes
3. Close HarmonySync properly
4. Disconnect MIDI devices if needed
5. Review any issues in logs

## Support Resources

### Getting Help

If you encounter issues:

1. **Check Logs:**
   - Linux: `~/.harmonysync/logs/`
   - macOS: `~/Library/Logs/HarmonySync/`
   - Windows: `%APPDATA%\HarmonySync\logs\`

2. **Documentation:**
   - Full documentation: `CARLA_PLUGIN_HOST_RESEARCH.md`
   - Implementation details: `CARLA_IMPLEMENTATION_EXAMPLE.md`
   - Performance testing: `CARLA_PERFORMANCE_TESTING.md`

3. **Community:**
   - GitHub Issues: [Submit bug reports]
   - Discord: [Join community]
   - Forums: [Get help from users]

### Recommended Plugins

#### Free Plugins

**Drums:**
- AVL Drums (https://gitlab.com/avldrums/avldrums)
- DrumGizmo (https://drumgizmo.org/)

**Piano/Keys:**
- Keyzone Classic (https://www.kvraudio.com/product/keyzone-classic)
- Piano One (https://neokontrol.wixsite.com/piano-one)

**Synths:**
- Surge XT (https://surge-synthesizer.github.io/)
- Vital (https://vital.audio/)

**Guitar Amps:**
- Tonex Free (https://www.ikmultimedia.com/products/tonex/)
- NAM (Neural Amp Modeler)

#### Commercial Plugins (Worth Considering)

**Drums:**
- Superior Drummer 3
- Addictive Drums 2

**Piano:**
- Pianoteq
- Keyscape

**Guitar:**
- Tonex (full version)
- Neural DSP plugins

## FAQ

**Q: Can I use VST3 plugins?**
A: Yes! HarmonySync supports VST2, VST3, LV2, and AU (macOS) plugins.

**Q: How many plugins can I run at once?**
A: Depends on your system. With 8 GB RAM, typically 4-6 heavy plugins or 10+ light plugins.

**Q: Will this work with my audio interface?**
A: Yes! Any ASIO (Windows), CoreAudio (macOS), or ALSA/JACK (Linux) compatible interface works.

**Q: Can I use plugins during video playback?**
A: Yes! Plugins run independently of HarmonySync's video/slide features.

**Q: What if I need more than 8 GB RAM?**
A: The implementation is scalable. With 16 GB RAM, you can run even more plugins.

**Q: Can I automate plugin parameters?**
A: Not in initial version, but planned for future updates.

**Q: Is there MIDI learn functionality?**
A: To be implemented. Currently use direct MIDI CC mapping in plugin.

## Next Steps

Now that you're set up:

1. **Experiment:** Try different plugins and configurations
2. **Practice:** Run through your setlist with plugins
3. **Optimize:** Find the best balance of quality and performance
4. **Share:** Share your configurations with your team
5. **Feedback:** Let us know what features you'd like to see!

## Summary

The Carla Plugin Host feature transforms HarmonySync into a complete live performance system. With proper setup and management, you can run professional plugins within an 8 GB memory budget while maintaining low latency for live use.

**Remember:**
- Monitor memory usage
- Test before going live
- Save configurations
- Have backups ready
- Keep it simple

Happy performing! 🎵
