# Carla Plugin Host Integration Research

## Executive Summary

This document provides comprehensive research and implementation guidance for integrating Carla plugin host capabilities into HarmonySync Presenter. The goal is to enable users to run audio plugins (VST, LV2, etc.) with dedicated MIDI device routing and audio output routing while maintaining a memory footprint under 8GB RAM.

## 1. Carla Overview

### What is Carla?

Carla is a fully-featured audio plugin host supporting multiple plugin formats:
- **VST2/VST3**: Virtual Studio Technology plugins
- **LV2**: Linux audio plugin standard
- **LADSPA/DSSI**: Linux audio plugins
- **AU**: Audio Units (macOS)
- **SF2/SFZ**: Soundfont support

### Key Features
- Multi-client and rack modes
- JACK, ALSA, and PulseAudio support
- Per-plugin MIDI and audio routing
- Low latency performance
- Preset management
- Built-in plugin bridging for stability

### Carla Variants
1. **Carla-Rack**: Rack-style multi-plugin container
2. **Carla-Patchbay**: Full patchbay with advanced routing
3. **libcarla**: Library for embedding Carla in applications

## 2. Integration Architecture

### 2.1 Recommended Approach: libcarla Embedding

For HarmonySync, the best approach is to use **libcarla** as a library, which provides:
- Native Rust bindings via FFI
- Direct control over plugin loading and routing
- Lower overhead than running Carla as a separate process
- Better integration with existing audio infrastructure

### 2.2 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HarmonySync Application                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Tauri (Rust Backend)                      │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │           Carla Plugin Manager Module            │ │ │
│  │  │                                                  │ │ │
│  │  │  • Plugin Loading/Unloading                     │ │ │
│  │  │  • MIDI Routing Matrix                          │ │ │
│  │  │  • Audio Output Routing                         │ │ │
│  │  │  • Memory Monitoring                            │ │ │
│  │  │  • Preset Management                            │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │                                                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐│ │
│  │  │   MIDI In    │  │  Audio Out   │  │   Memory    ││ │
│  │  │   Manager    │  │   Router     │  │   Monitor   ││ │
│  │  └──────────────┘  └──────────────┘  └─────────────┘│ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              React Frontend                            │ │
│  │  • Plugin Management UI                                │ │
│  │  • MIDI Device Assignment                              │ │
│  │  • Audio Routing Configuration                         │ │
│  │  • Memory Usage Display                                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     libcarla (C++ Library)                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │   VST/LV2  │  │    MIDI    │  │   Audio    │           │
│  │   Plugins  │  │   Router   │  │   Engine   │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Audio Interface (e.g., Behringer X18)          │
│  Channels: 1-2: Drums, 3-4: Keys, 5: Guitar 1, 6: Guitar 2 │
└─────────────────────────────────────────────────────────────┘
```

## 3. MIDI Device Routing System

### 3.1 Design Requirements

Each plugin must be assignable to:
- A specific MIDI input device (e.g., electric kit, MIDI keyboard)
- A specific MIDI channel (1-16)
- Optional MIDI filtering/transformation

### 3.2 Implementation Approach

```rust
// Rust data structures for MIDI routing

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MidiDeviceInfo {
    pub id: String,
    pub name: String,
    pub manufacturer: String,
    pub is_input: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MidiRouting {
    pub device_id: String,
    pub channel: Option<u8>, // 1-16, None for all channels
    pub velocity_curve: VelocityCurve,
    pub transpose: i8, // -12 to +12 semitones
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VelocityCurve {
    Linear,
    Logarithmic,
    Exponential,
    Custom(Vec<(u8, u8)>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInstance {
    pub id: String,
    pub name: String,
    pub plugin_path: String,
    pub midi_routing: MidiRouting,
    pub audio_routing: AudioRouting,
    pub memory_usage: usize, // bytes
}
```

### 3.3 MIDI Routing Matrix

Create a routing matrix that maps:
```
[MIDI Device] -> [MIDI Channel] -> [Plugin Instance]
```

Example configuration:
```json
{
  "midi_routes": [
    {
      "device": "Electric Drum Kit",
      "channel": 10,
      "plugin": "AVL Drums",
      "enabled": true
    },
    {
      "device": "MIDI Keyboard",
      "channel": 1,
      "plugin": "Keyzone Classic",
      "enabled": true
    }
  ]
}
```

## 4. Audio Output Routing System

### 4.1 Design Requirements

Each plugin must route its audio output to:
- Specific audio interface channels
- Support for mono, stereo, or multi-channel outputs
- Individual gain control per route
- Optional effects chain (EQ, compression, etc.)

### 4.2 Implementation Approach

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDevice {
    pub id: String,
    pub name: String,
    pub input_channels: usize,
    pub output_channels: usize,
    pub sample_rate: u32,
    pub buffer_size: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioRouting {
    pub device_id: String,
    pub output_channels: Vec<usize>, // e.g., [0, 1] for stereo to channels 1-2
    pub gain_db: f32,
    pub pan: f32, // -1.0 (left) to 1.0 (right)
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioRoutingConfig {
    pub routes: Vec<PluginAudioRoute>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginAudioRoute {
    pub plugin_id: String,
    pub plugin_name: String,
    pub output_channels: Vec<usize>,
    pub gain_db: f32,
}
```

### 4.3 Example Routing Configuration

For Behringer X18 interface:
```json
{
  "audio_routes": [
    {
      "plugin": "AVL Drums",
      "outputs": [0, 1],
      "channels": "1-2 (Stereo)",
      "gain_db": 0.0
    },
    {
      "plugin": "Keyzone Classic",
      "outputs": [2, 3],
      "channels": "3-4 (Stereo)",
      "gain_db": 0.0
    },
    {
      "plugin": "Tonex 1",
      "outputs": [4],
      "channels": "5 (Mono)",
      "gain_db": 0.0
    },
    {
      "plugin": "Tonex 2",
      "outputs": [5],
      "channels": "6 (Mono)",
      "gain_db": 0.0
    }
  ]
}
```

## 5. Memory Usage Analysis

### 5.1 Memory Breakdown

Typical memory usage for audio plugins:

| Component | Estimated Memory | Notes |
|-----------|-----------------|-------|
| AVL Drums | 200-500 MB | Large sample library |
| Keyzone Classic | 100-300 MB | Depends on loaded samples |
| Tonex (per instance) | 50-100 MB | Neural amp models |
| Carla Host | 50-100 MB | Base framework |
| HarmonySync App | 200-300 MB | Existing application |
| System Overhead | 500 MB | OS, drivers, buffers |

**Total Estimated: 1.1 - 1.9 GB** for the described setup

### 5.2 Memory Optimization Strategies

1. **Lazy Loading**: Load plugins only when needed
2. **Sample Streaming**: Stream large sample libraries from disk instead of loading entirely into RAM
3. **Buffer Size Management**: Use optimal buffer sizes (256-512 samples typical)
4. **Unload Unused Plugins**: Automatically unload inactive plugins after a timeout
5. **Memory Pooling**: Reuse allocated buffers where possible

### 5.3 Memory Monitoring

Implement real-time memory monitoring:

```rust
#[derive(Debug, Clone, Serialize)]
pub struct MemoryStats {
    pub total_system_mb: usize,
    pub total_used_mb: usize,
    pub available_mb: usize,
    pub harmonysync_used_mb: usize,
    pub plugins_used_mb: usize,
    pub per_plugin_usage: HashMap<String, usize>,
}

#[command]
pub async fn get_memory_stats() -> Result<MemoryStats, String> {
    // Implementation to query system and plugin memory usage
    todo!()
}
```

## 6. Performance Considerations

### 6.1 Latency Requirements

For live performance:
- **Target Latency**: < 10ms round-trip
- **Buffer Size**: 256 samples @ 48kHz = 5.3ms
- **Plugin Processing**: 1-3ms per plugin
- **Total Budget**: ~15-20ms is acceptable for most performers

### 6.2 CPU Usage

Expected CPU usage:
- AVL Drums: 5-10% (per voice)
- Keyzone Classic: 3-5%
- Tonex: 10-15% (per instance, depends on model complexity)
- Total: 25-50% on a modern quad-core CPU

### 6.3 Load Testing Recommendations

Test with:
1. All plugins loaded simultaneously
2. Maximum polyphony (10+ simultaneous notes)
3. Complex MIDI patterns (drum rolls, fast arpeggios)
4. Monitor CPU usage, memory, and latency
5. Test for 30+ minutes to detect memory leaks

## 7. Implementation Dependencies

### 7.1 Required Crates (Rust)

Add to `Cargo.toml`:
```toml
[dependencies]
# MIDI handling
midir = "0.9"
wmidi = "4.0"

# Audio processing (if not using Carla's built-in)
cpal = "0.15"  # Cross-platform audio I/O

# Carla integration (would need custom bindings)
# libcarla-sys = { path = "./libcarla-sys" }  # Custom FFI bindings

# System monitoring
sysinfo = "0.30"

# Async runtime (already included)
tokio = { version = "1", features = ["full"] }
```

### 7.2 System Dependencies

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install -y \
    carla \
    libcarla-dev \
    libjack-jackd2-dev \
    libasound2-dev \
    libpulse-dev
```

**macOS:**
```bash
brew install carla
```

**Windows:**
- Download Carla from https://kx.studio/Applications:Carla
- May require ASIO drivers for low latency

### 7.3 Carla Bindings

Since Carla doesn't have official Rust bindings, we need to create FFI bindings:

```rust
// libcarla-sys/src/lib.rs
use std::os::raw::{c_char, c_int, c_void, c_float};

#[repr(C)]
pub struct CarlaHostHandle {
    _private: [u8; 0],
}

#[link(name = "carla_standalone2")]
extern "C" {
    pub fn carla_standalone_host_init() -> *mut CarlaHostHandle;
    pub fn carla_standalone_host_free(handle: *mut CarlaHostHandle);
    
    pub fn carla_add_plugin(
        handle: *mut CarlaHostHandle,
        btype: c_int,
        ptype: c_int,
        filename: *const c_char,
        name: *const c_char,
        label: *const c_char,
        unique_id: i64,
        extra_ptr: *const c_void,
        options: c_int,
    ) -> c_int;
    
    pub fn carla_remove_plugin(handle: *mut CarlaHostHandle, plugin_id: c_int) -> bool;
    
    pub fn carla_set_plugin_parameter(
        handle: *mut CarlaHostHandle,
        plugin_id: c_int,
        parameter_id: c_int,
        value: c_float,
    );
    
    // MIDI functions
    pub fn carla_send_midi_note(
        handle: *mut CarlaHostHandle,
        plugin_id: c_int,
        channel: c_int,
        note: c_int,
        velocity: c_int,
    );
    
    // Audio routing functions
    pub fn carla_set_audio_routing(
        handle: *mut CarlaHostHandle,
        plugin_id: c_int,
        input_port: c_int,
        output_port: c_int,
    ) -> bool;
}
```

## 8. User Interface Design

### 8.1 Plugin Manager Component

Create a new React component for plugin management:

```jsx
// PluginManager.jsx
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

export function PluginManager() {
  const [plugins, setPlugins] = useState([]);
  const [midiDevices, setMidiDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [memoryStats, setMemoryStats] = useState(null);

  useEffect(() => {
    loadPlugins();
    loadDevices();
    
    // Update memory stats every 5 seconds
    const interval = setInterval(loadMemoryStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadPlugins = async () => {
    const result = await invoke('get_loaded_plugins');
    setPlugins(result);
  };

  const loadDevices = async () => {
    const midi = await invoke('get_available_midi_inputs');
    const audio = await invoke('get_available_audio_devices');
    setMidiDevices(midi);
    setAudioDevices(audio);
  };

  const loadMemoryStats = async () => {
    const stats = await invoke('get_memory_stats');
    setMemoryStats(stats);
  };

  const loadPlugin = async (pluginPath) => {
    await invoke('load_plugin', { pluginPath });
    loadPlugins();
  };

  const unloadPlugin = async (pluginId) => {
    await invoke('unload_plugin', { pluginId });
    loadPlugins();
  };

  const setMidiRouting = async (pluginId, deviceId, channel) => {
    await invoke('set_plugin_midi_routing', {
      pluginId,
      deviceId,
      channel
    });
  };

  const setAudioRouting = async (pluginId, outputChannels) => {
    await invoke('set_plugin_audio_routing', {
      pluginId,
      outputChannels
    });
  };

  return (
    <div className="plugin-manager">
      <h2>Plugin Manager</h2>
      
      {/* Memory Usage Display */}
      {memoryStats && (
        <div className="memory-stats">
          <h3>Memory Usage</h3>
          <div className="memory-bar">
            <div 
              className="memory-used"
              style={{width: `${(memoryStats.plugins_used_mb / 8192) * 100}%`}}
            />
          </div>
          <p>{memoryStats.plugins_used_mb} MB / 8192 MB</p>
        </div>
      )}

      {/* Plugin List */}
      <div className="plugin-list">
        {plugins.map(plugin => (
          <div key={plugin.id} className="plugin-item">
            <h4>{plugin.name}</h4>
            <p>Memory: {plugin.memory_usage_mb} MB</p>
            
            {/* MIDI Routing */}
            <div className="midi-routing">
              <label>MIDI Input:</label>
              <select 
                value={plugin.midi_routing?.device_id || ''}
                onChange={(e) => setMidiRouting(plugin.id, e.target.value, 1)}
              >
                <option value="">None</option>
                {midiDevices.map(dev => (
                  <option key={dev.id} value={dev.id}>{dev.name}</option>
                ))}
              </select>
            </div>

            {/* Audio Routing */}
            <div className="audio-routing">
              <label>Output Channels:</label>
              <input 
                type="text" 
                placeholder="e.g., 1,2"
                value={plugin.audio_routing?.output_channels?.join(',') || ''}
                onChange={(e) => {
                  const channels = e.target.value.split(',').map(Number);
                  setAudioRouting(plugin.id, channels);
                }}
              />
            </div>

            <button onClick={() => unloadPlugin(plugin.id)}>Unload</button>
          </div>
        ))}
      </div>

      {/* Add Plugin Button */}
      <button onClick={() => {
        // Open file dialog to select plugin
        invoke('open_plugin_dialog').then(path => {
          if (path) loadPlugin(path);
        });
      }}>
        Add Plugin
      </button>
    </div>
  );
}
```

### 8.2 CSS Styling

```css
/* plugin-manager.css */
.plugin-manager {
  padding: 20px;
}

.memory-stats {
  background: #f0f0f0;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.memory-bar {
  height: 20px;
  background: #ddd;
  border-radius: 10px;
  overflow: hidden;
  margin: 10px 0;
}

.memory-used {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #FFC107);
  transition: width 0.3s;
}

.plugin-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.plugin-item {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
}

.midi-routing, .audio-routing {
  margin: 10px 0;
}

.midi-routing select,
.audio-routing input {
  width: 100%;
  padding: 5px;
  margin-top: 5px;
}
```

## 9. Backend Implementation Plan

### 9.1 Plugin Manager Module

Create a new Rust module `carla_plugin_manager.rs`:

```rust
// src-tauri/src/application/carla_plugin_manager.rs

use std::sync::Arc;
use tokio::sync::Mutex;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub id: String,
    pub name: String,
    pub plugin_path: String,
    pub plugin_type: PluginType,
    pub midi_routing: Option<MidiRouting>,
    pub audio_routing: AudioRouting,
    pub memory_usage_mb: usize,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PluginType {
    VST2,
    VST3,
    LV2,
    LADSPA,
    AU,
}

pub struct CarlaPluginManager {
    plugins: Arc<Mutex<HashMap<String, PluginInfo>>>,
    // Handle to Carla host (would use FFI)
    // carla_handle: *mut CarlaHostHandle,
}

impl CarlaPluginManager {
    pub fn new() -> Result<Self> {
        Ok(Self {
            plugins: Arc::new(Mutex::new(HashMap::new())),
        })
    }

    pub async fn load_plugin(&self, plugin_path: &str, name: &str) -> Result<String> {
        let plugin_id = uuid::Uuid::new_v4().to_string();
        
        // TODO: Call Carla FFI to actually load the plugin
        // let result = unsafe {
        //     carla_add_plugin(self.carla_handle, ...)
        // };
        
        let plugin_info = PluginInfo {
            id: plugin_id.clone(),
            name: name.to_string(),
            plugin_path: plugin_path.to_string(),
            plugin_type: PluginType::VST2, // Detect from file
            midi_routing: None,
            audio_routing: AudioRouting {
                device_id: String::new(),
                output_channels: vec![0, 1],
                gain_db: 0.0,
                pan: 0.0,
                enabled: true,
            },
            memory_usage_mb: 0,
            is_active: true,
        };

        let mut plugins = self.plugins.lock().await;
        plugins.insert(plugin_id.clone(), plugin_info);
        
        Ok(plugin_id)
    }

    pub async fn unload_plugin(&self, plugin_id: &str) -> Result<()> {
        // TODO: Call Carla FFI to unload
        let mut plugins = self.plugins.lock().await;
        plugins.remove(plugin_id);
        Ok(())
    }

    pub async fn set_midi_routing(
        &self,
        plugin_id: &str,
        midi_routing: MidiRouting,
    ) -> Result<()> {
        let mut plugins = self.plugins.lock().await;
        if let Some(plugin) = plugins.get_mut(plugin_id) {
            plugin.midi_routing = Some(midi_routing);
            // TODO: Update Carla routing
        }
        Ok(())
    }

    pub async fn set_audio_routing(
        &self,
        plugin_id: &str,
        audio_routing: AudioRouting,
    ) -> Result<()> {
        let mut plugins = self.plugins.lock().await;
        if let Some(plugin) = plugins.get_mut(plugin_id) {
            plugin.audio_routing = audio_routing;
            // TODO: Update Carla routing
        }
        Ok(())
    }

    pub async fn get_plugins(&self) -> Vec<PluginInfo> {
        let plugins = self.plugins.lock().await;
        plugins.values().cloned().collect()
    }

    pub async fn get_memory_usage(&self) -> MemoryStats {
        // TODO: Query actual memory usage from Carla and system
        MemoryStats {
            total_system_mb: 16384,
            total_used_mb: 4096,
            available_mb: 12288,
            harmonysync_used_mb: 300,
            plugins_used_mb: 800,
            per_plugin_usage: HashMap::new(),
        }
    }
}

// Global instance
static PLUGIN_MANAGER: Lazy<Arc<Mutex<Option<CarlaPluginManager>>>> =
    Lazy::new(|| Arc::new(Mutex::new(None)));

pub async fn get_plugin_manager() -> Result<Arc<Mutex<Option<CarlaPluginManager>>>> {
    Ok(PLUGIN_MANAGER.clone())
}
```

### 9.2 Tauri Commands

Add commands to `commands.rs`:

```rust
#[command]
pub async fn load_plugin(plugin_path: String, name: String) -> Result<String, String> {
    let manager = get_plugin_manager().await.map_err(|e| e.to_string())?;
    let manager_guard = manager.lock().await;
    
    if let Some(mgr) = manager_guard.as_ref() {
        mgr.load_plugin(&plugin_path, &name)
            .await
            .map_err(|e| e.to_string())
    } else {
        Err("Plugin manager not initialized".to_string())
    }
}

#[command]
pub async fn unload_plugin(plugin_id: String) -> Result<(), String> {
    let manager = get_plugin_manager().await.map_err(|e| e.to_string())?;
    let manager_guard = manager.lock().await;
    
    if let Some(mgr) = manager_guard.as_ref() {
        mgr.unload_plugin(&plugin_id)
            .await
            .map_err(|e| e.to_string())
    } else {
        Err("Plugin manager not initialized".to_string())
    }
}

#[command]
pub async fn get_loaded_plugins() -> Result<Vec<PluginInfo>, String> {
    let manager = get_plugin_manager().await.map_err(|e| e.to_string())?;
    let manager_guard = manager.lock().await;
    
    if let Some(mgr) = manager_guard.as_ref() {
        Ok(mgr.get_plugins().await)
    } else {
        Ok(vec![])
    }
}

#[command]
pub async fn set_plugin_midi_routing(
    plugin_id: String,
    device_id: String,
    channel: u8,
) -> Result<(), String> {
    let manager = get_plugin_manager().await.map_err(|e| e.to_string())?;
    let manager_guard = manager.lock().await;
    
    if let Some(mgr) = manager_guard.as_ref() {
        let routing = MidiRouting {
            device_id,
            channel: Some(channel),
            velocity_curve: VelocityCurve::Linear,
            transpose: 0,
        };
        mgr.set_midi_routing(&plugin_id, routing)
            .await
            .map_err(|e| e.to_string())
    } else {
        Err("Plugin manager not initialized".to_string())
    }
}

#[command]
pub async fn set_plugin_audio_routing(
    plugin_id: String,
    output_channels: Vec<usize>,
) -> Result<(), String> {
    let manager = get_plugin_manager().await.map_err(|e| e.to_string())?;
    let manager_guard = manager.lock().await;
    
    if let Some(mgr) = manager_guard.as_ref() {
        let routing = AudioRouting {
            device_id: String::new(),
            output_channels,
            gain_db: 0.0,
            pan: 0.0,
            enabled: true,
        };
        mgr.set_audio_routing(&plugin_id, routing)
            .await
            .map_err(|e| e.to_string())
    } else {
        Err("Plugin manager not initialized".to_string())
    }
}

#[command]
pub async fn get_memory_stats() -> Result<MemoryStats, String> {
    let manager = get_plugin_manager().await.map_err(|e| e.to_string())?;
    let manager_guard = manager.lock().await;
    
    if let Some(mgr) = manager_guard.as_ref() {
        Ok(mgr.get_memory_usage().await)
    } else {
        Err("Plugin manager not initialized".to_string())
    }
}

#[command]
pub async fn open_plugin_dialog() -> Result<Option<String>, String> {
    // Use Tauri's file dialog to select a plugin file
    use tauri_plugin_dialog::DialogExt;
    // Implementation depends on Tauri dialog API
    Ok(None)
}
```

## 10. Testing Strategy

### 10.1 Test Scenarios

1. **Plugin Loading**
   - Load AVL Drums successfully
   - Load Keyzone Classic successfully
   - Load 2 Tonex instances successfully
   - Verify all plugins appear in UI

2. **MIDI Routing**
   - Connect electric drum kit to AVL Drums
   - Connect MIDI keyboard to Keyzone Classic
   - Test MIDI note pass-through
   - Test channel filtering

3. **Audio Routing**
   - Route AVL Drums to channels 1-2
   - Route Keyzone to channels 3-4
   - Route Tonex instances to channels 5 and 6
   - Verify audio on correct channels with oscilloscope/DAW

4. **Memory Monitoring**
   - Monitor initial memory usage
   - Load all plugins and measure increase
   - Play for 30 minutes, check for leaks
   - Unload plugins and verify memory release

5. **Load Testing**
   - Play drum kit with max polyphony (10+ notes)
   - Play fast keyboard passages
   - Process guitar through both Tonex instances
   - Monitor CPU and latency
   - Check for audio dropouts

### 10.2 Performance Benchmarks

Target metrics:
- **Memory**: < 2 GB total (within 8 GB system budget)
- **CPU**: < 50% on quad-core system
- **Latency**: < 15ms round-trip
- **Stability**: No crashes in 4+ hour sessions
- **Load Time**: Plugins load in < 5 seconds

## 11. Deployment Considerations

### 11.1 Installation Package

Include in the installer:
- Carla binaries (or link to system installation)
- Default plugin paths for common locations
- Audio driver setup wizard
- MIDI device auto-detection

### 11.2 Configuration Files

Create default configuration in `~/.harmonysync/plugins/`:
```
plugins/
├── config.json          # Plugin manager settings
├── routing.json         # MIDI and audio routing
├── presets/            # User presets
│   ├── drums.preset
│   ├── keys.preset
│   └── guitar.preset
└── cache/              # Plugin cache
```

### 11.3 First-Run Wizard

Guide users through:
1. Audio interface selection
2. MIDI device detection
3. Plugin folder scanning
4. Initial routing setup
5. Performance optimization

## 12. Risks and Mitigation

### 12.1 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Carla library compatibility | High | Test on multiple platforms, provide fallback |
| Memory exceeds 8GB | High | Implement aggressive streaming, unload unused |
| Audio dropouts | High | Optimize buffer sizes, priority threads |
| Plugin crashes | Medium | Use Carla's bridging for isolation |
| MIDI timing issues | Medium | Use dedicated MIDI thread, adjust buffers |

### 12.2 User Experience Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Complex configuration | Medium | Provide presets and wizard |
| Plugin compatibility | Medium | Test with common plugins, provide whitelist |
| Performance on older hardware | Low | Document minimum requirements |

## 13. Alternative Approaches

### 13.1 Alternative 1: Dedicated Plugin Host Process

Instead of embedding Carla, run it as a separate process:
- **Pros**: Better isolation, easier updates, less integration work
- **Cons**: More complex IPC, potential sync issues

### 13.2 Alternative 2: Direct VST/LV2 Support

Implement plugin hosting directly without Carla:
- **Pros**: Tighter integration, potentially lower overhead
- **Cons**: Much more development work, need to support multiple formats

### 13.3 Alternative 3: JACK Integration

Use JACK audio connection kit as middleware:
- **Pros**: Industry standard, flexible routing, proven reliability
- **Cons**: Additional dependency, learning curve for users

## 14. Recommendations

### 14.1 Immediate Next Steps

1. **Prototype Phase** (1-2 weeks)
   - Create Rust FFI bindings for Carla
   - Implement basic plugin loading
   - Test with one simple plugin (e.g., gain plugin)

2. **Core Implementation** (2-3 weeks)
   - Implement MIDI routing system
   - Implement audio routing system
   - Create basic UI for plugin management

3. **Testing Phase** (1-2 weeks)
   - Load test with target plugins
   - Measure memory and CPU usage
   - Optimize performance bottlenecks

4. **Polish Phase** (1 week)
   - Add preset system
   - Improve UI/UX
   - Create user documentation

### 14.2 Success Criteria

The implementation will be considered successful if:
- ✅ Can load and run AVL Drums, Keyzone Classic, and 2 Tonex instances simultaneously
- ✅ MIDI devices can be independently routed to each plugin
- ✅ Audio outputs can be routed to specific interface channels
- ✅ Total memory usage stays under 2 GB (well within 8 GB limit)
- ✅ System is stable during 2+ hour sessions
- ✅ Latency is acceptable for live performance (< 15ms)

### 14.3 Long-Term Enhancements

Future additions could include:
- Plugin preset management
- Automation recording/playback
- MIDI learn for parameter control
- Audio effects chains per plugin
- Session templates
- Remote control via OSC/MIDI

## 15. Conclusion

Integrating Carla plugin host into HarmonySync is technically feasible and will provide powerful capabilities for running professional audio plugins with flexible routing. The memory requirements are well within the 8GB constraint, and the expected CPU load should be manageable on modern hardware.

The recommended approach is to use libcarla embedded in the Rust backend, with custom FFI bindings. This provides the best balance of integration, performance, and maintainability.

With proper implementation, users will be able to:
- Run AVL Drums with electric drum kit
- Run Keyzone Classic with MIDI keyboard
- Run multiple Tonex instances for guitar processing
- Route each to specific audio interface channels
- Monitor memory usage in real-time
- Save and recall routing configurations

The implementation should proceed in phases, starting with a prototype to validate the approach, followed by core implementation, testing, and polish.

## 16. References

- [Carla Documentation](https://kx.studio/Documentation:Carla)
- [Carla GitHub Repository](https://github.com/falkTX/Carla)
- [VST Plugin Standard](https://www.steinberg.net/vst-developer/)
- [LV2 Plugin Standard](https://lv2plug.in/)
- [JACK Audio Connection Kit](https://jackaudio.org/)
- [midir (Rust MIDI library)](https://docs.rs/midir/)
- [cpal (Rust audio I/O)](https://docs.rs/cpal/)
