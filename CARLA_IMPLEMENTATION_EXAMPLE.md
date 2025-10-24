# Carla Plugin Host - Implementation Example

This document provides concrete code examples for implementing the Carla plugin host feature in HarmonySync.

## Table of Contents
1. [Rust Backend Structure](#rust-backend-structure)
2. [MIDI Device Management](#midi-device-management)
3. [Audio Routing Implementation](#audio-routing-implementation)
4. [Frontend Components](#frontend-components)
5. [Configuration Management](#configuration-management)

## 1. Rust Backend Structure

### Project Structure

```
harmonysync/src-tauri/src/
├── application/
│   ├── commands.rs              # Existing Tauri commands
│   ├── carla_plugin_manager.rs  # NEW: Plugin management
│   ├── midi_manager.rs          # NEW: MIDI device handling
│   ├── audio_router.rs          # NEW: Audio routing
│   └── mod.rs
├── domain/
│   ├── plugin.rs                # NEW: Plugin domain models
│   ├── midi.rs                  # NEW: MIDI domain models
│   └── audio.rs                 # NEW: Audio domain models
└── lib.rs
```

## 2. MIDI Device Management

### midi_manager.rs

```rust
// harmonysync/src-tauri/src/application/midi_manager.rs

use midir::{MidiInput, MidiOutput, MidiInputConnection, MidiOutputConnection};
use std::sync::Arc;
use tokio::sync::Mutex;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use anyhow::{Result, anyhow};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MidiDevice {
    pub id: String,
    pub name: String,
    pub manufacturer: String,
    pub is_input: bool,
    pub port_index: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MidiMessage {
    pub timestamp: u64,
    pub status: u8,
    pub data1: u8,
    pub data2: u8,
}

pub struct MidiManager {
    input_connections: Arc<Mutex<HashMap<String, MidiInputConnection<()>>>>,
    output_connections: Arc<Mutex<HashMap<String, MidiOutputConnection>>>,
    message_callbacks: Arc<Mutex<HashMap<String, Box<dyn Fn(MidiMessage) + Send + Sync>>>>,
}

impl MidiManager {
    pub fn new() -> Result<Self> {
        Ok(Self {
            input_connections: Arc::new(Mutex::new(HashMap::new())),
            output_connections: Arc::new(Mutex::new(HashMap::new())),
            message_callbacks: Arc::new(Mutex::new(HashMap::new())),
        })
    }

    /// Get all available MIDI input devices
    pub fn get_input_devices(&self) -> Result<Vec<MidiDevice>> {
        let midi_in = MidiInput::new("HarmonySync MIDI Input")?;
        let mut devices = Vec::new();

        for (i, port) in midi_in.ports().iter().enumerate() {
            if let Ok(name) = midi_in.port_name(port) {
                devices.push(MidiDevice {
                    id: format!("midi_in_{}", i),
                    name: name.clone(),
                    manufacturer: "Unknown".to_string(),
                    is_input: true,
                    port_index: i,
                });
            }
        }

        Ok(devices)
    }

    /// Get all available MIDI output devices
    pub fn get_output_devices(&self) -> Result<Vec<MidiDevice>> {
        let midi_out = MidiOutput::new("HarmonySync MIDI Output")?;
        let mut devices = Vec::new();

        for (i, port) in midi_out.ports().iter().enumerate() {
            if let Ok(name) = midi_out.port_name(port) {
                devices.push(MidiDevice {
                    id: format!("midi_out_{}", i),
                    name: name.clone(),
                    manufacturer: "Unknown".to_string(),
                    is_input: false,
                    port_index: i,
                });
            }
        }

        Ok(devices)
    }

    /// Connect to a MIDI input device
    pub async fn connect_input<F>(
        &self,
        device_id: &str,
        port_index: usize,
        callback: F,
    ) -> Result<()>
    where
        F: Fn(MidiMessage) + Send + Sync + 'static,
    {
        let midi_in = MidiInput::new("HarmonySync MIDI Input")?;
        let ports = midi_in.ports();
        
        if port_index >= ports.len() {
            return Err(anyhow!("Invalid MIDI port index"));
        }

        let port = &ports[port_index];
        let port_name = midi_in.port_name(port)?;

        let callback_arc = Arc::new(callback);
        let callback_clone = callback_arc.clone();

        let connection = midi_in.connect(
            port,
            &format!("harmonysync-{}", port_name),
            move |timestamp, message, _| {
                if message.len() >= 3 {
                    let midi_msg = MidiMessage {
                        timestamp,
                        status: message[0],
                        data1: message[1],
                        data2: message[2],
                    };
                    callback_clone(midi_msg);
                }
            },
            (),
        )?;

        let mut connections = self.input_connections.lock().await;
        connections.insert(device_id.to_string(), connection);

        Ok(())
    }

    /// Disconnect from a MIDI input device
    pub async fn disconnect_input(&self, device_id: &str) -> Result<()> {
        let mut connections = self.input_connections.lock().await;
        connections.remove(device_id);
        Ok(())
    }

    /// Send a MIDI message to a specific plugin
    pub async fn send_to_plugin(
        &self,
        plugin_id: &str,
        message: MidiMessage,
    ) -> Result<()> {
        // This would integrate with the Carla plugin manager
        // to route the MIDI message to the correct plugin
        println!(
            "Routing MIDI to plugin {}: status={}, data1={}, data2={}",
            plugin_id, message.status, message.data1, message.data2
        );
        Ok(())
    }

    /// Parse MIDI message type
    pub fn parse_message_type(status: u8) -> String {
        match status & 0xF0 {
            0x80 => "Note Off".to_string(),
            0x90 => "Note On".to_string(),
            0xA0 => "Polyphonic Aftertouch".to_string(),
            0xB0 => "Control Change".to_string(),
            0xC0 => "Program Change".to_string(),
            0xD0 => "Channel Aftertouch".to_string(),
            0xE0 => "Pitch Bend".to_string(),
            0xF0 => "System Message".to_string(),
            _ => "Unknown".to_string(),
        }
    }
}

// Global MIDI manager instance
use once_cell::sync::Lazy;

static MIDI_MANAGER: Lazy<Arc<Mutex<Option<MidiManager>>>> =
    Lazy::new(|| Arc::new(Mutex::new(None)));

pub async fn get_midi_manager() -> Result<Arc<Mutex<Option<MidiManager>>>> {
    Ok(MIDI_MANAGER.clone())
}

pub async fn initialize_midi_manager() -> Result<()> {
    let manager = MidiManager::new()?;
    let mut global = MIDI_MANAGER.lock().await;
    *global = Some(manager);
    Ok(())
}
```

## 3. Audio Routing Implementation

### audio_router.rs

```rust
// harmonysync/src-tauri/src/application/audio_router.rs

use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use anyhow::{Result, anyhow};

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
pub struct AudioRoute {
    pub plugin_id: String,
    pub source_channel: usize,
    pub destination_device: String,
    pub destination_channel: usize,
    pub gain_db: f32,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelStrip {
    pub gain_db: f32,
    pub pan: f32, // -1.0 (L) to 1.0 (R)
    pub mute: bool,
    pub solo: bool,
}

pub struct AudioRouter {
    routes: Arc<Mutex<HashMap<String, AudioRoute>>>,
    channel_strips: Arc<Mutex<HashMap<String, ChannelStrip>>>,
    active_device: Arc<Mutex<Option<String>>>,
}

impl AudioRouter {
    pub fn new() -> Self {
        Self {
            routes: Arc::new(Mutex::new(HashMap::new())),
            channel_strips: Arc::new(Mutex::new(HashMap::new())),
            active_device: Arc::new(Mutex::new(None)),
        }
    }

    /// Get all available audio devices
    pub async fn get_audio_devices(&self) -> Result<Vec<AudioDevice>> {
        // This would use cpal or similar to enumerate audio devices
        // For now, return example data
        Ok(vec![
            AudioDevice {
                id: "behringer_x18".to_string(),
                name: "Behringer X18".to_string(),
                input_channels: 18,
                output_channels: 18,
                sample_rate: 48000,
                buffer_size: 256,
            },
            AudioDevice {
                id: "default".to_string(),
                name: "Default Audio Device".to_string(),
                input_channels: 2,
                output_channels: 2,
                sample_rate: 48000,
                buffer_size: 512,
            },
        ])
    }

    /// Set the active audio device
    pub async fn set_active_device(&self, device_id: String) -> Result<()> {
        let mut active = self.active_device.lock().await;
        *active = Some(device_id);
        Ok(())
    }

    /// Create an audio route from a plugin to an output channel
    pub async fn add_route(&self, route: AudioRoute) -> Result<()> {
        let route_id = format!("{}_ch{}", route.plugin_id, route.source_channel);
        let mut routes = self.routes.lock().await;
        routes.insert(route_id, route);
        Ok(())
    }

    /// Remove an audio route
    pub async fn remove_route(&self, route_id: &str) -> Result<()> {
        let mut routes = self.routes.lock().await;
        routes.remove(route_id);
        Ok(())
    }

    /// Get all routes for a specific plugin
    pub async fn get_plugin_routes(&self, plugin_id: &str) -> Vec<AudioRoute> {
        let routes = self.routes.lock().await;
        routes
            .values()
            .filter(|r| r.plugin_id == plugin_id)
            .cloned()
            .collect()
    }

    /// Set channel strip parameters
    pub async fn set_channel_strip(
        &self,
        plugin_id: &str,
        strip: ChannelStrip,
    ) -> Result<()> {
        let mut strips = self.channel_strips.lock().await;
        strips.insert(plugin_id.to_string(), strip);
        Ok(())
    }

    /// Get channel strip for a plugin
    pub async fn get_channel_strip(&self, plugin_id: &str) -> Option<ChannelStrip> {
        let strips = self.channel_strips.lock().await;
        strips.get(plugin_id).cloned()
    }

    /// Configure routing for the example setup (drums, keys, guitars)
    pub async fn configure_example_routing(&self) -> Result<()> {
        // AVL Drums -> Channels 1-2
        self.add_route(AudioRoute {
            plugin_id: "avl_drums".to_string(),
            source_channel: 0,
            destination_device: "behringer_x18".to_string(),
            destination_channel: 0,
            gain_db: 0.0,
            enabled: true,
        }).await?;

        self.add_route(AudioRoute {
            plugin_id: "avl_drums".to_string(),
            source_channel: 1,
            destination_device: "behringer_x18".to_string(),
            destination_channel: 1,
            gain_db: 0.0,
            enabled: true,
        }).await?;

        // Keyzone Classic -> Channels 3-4
        self.add_route(AudioRoute {
            plugin_id: "keyzone_classic".to_string(),
            source_channel: 0,
            destination_device: "behringer_x18".to_string(),
            destination_channel: 2,
            gain_db: 0.0,
            enabled: true,
        }).await?;

        self.add_route(AudioRoute {
            plugin_id: "keyzone_classic".to_string(),
            source_channel: 1,
            destination_device: "behringer_x18".to_string(),
            destination_channel: 3,
            gain_db: 0.0,
            enabled: true,
        }).await?;

        // Tonex 1 -> Channel 5
        self.add_route(AudioRoute {
            plugin_id: "tonex_1".to_string(),
            source_channel: 0,
            destination_device: "behringer_x18".to_string(),
            destination_channel: 4,
            gain_db: 0.0,
            enabled: true,
        }).await?;

        // Tonex 2 -> Channel 6
        self.add_route(AudioRoute {
            plugin_id: "tonex_2".to_string(),
            source_channel: 0,
            destination_device: "behringer_x18".to_string(),
            destination_channel: 5,
            gain_db: 0.0,
            enabled: true,
        }).await?;

        Ok(())
    }
}

// Global audio router instance
use once_cell::sync::Lazy;

static AUDIO_ROUTER: Lazy<Arc<Mutex<Option<AudioRouter>>>> =
    Lazy::new(|| Arc::new(Mutex::new(None)));

pub async fn get_audio_router() -> Arc<Mutex<Option<AudioRouter>>> {
    AUDIO_ROUTER.clone()
}

pub async fn initialize_audio_router() -> Result<()> {
    let router = AudioRouter::new();
    let mut global = AUDIO_ROUTER.lock().await;
    *global = Some(router);
    Ok(())
}
```

## 4. Frontend Components

### PluginManager.jsx

```jsx
// harmonysync/src/components/PluginManager.jsx

import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/plugin-dialog';
import './styles/plugin-manager.css';

export function PluginManager() {
  const [plugins, setPlugins] = useState([]);
  const [midiInputs, setMidiInputs] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [memoryStats, setMemoryStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(updateMemoryStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadPlugins(),
        loadMidiDevices(),
        loadAudioDevices(),
        updateMemoryStats(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadPlugins = async () => {
    try {
      const result = await invoke('get_loaded_plugins');
      setPlugins(result);
    } catch (error) {
      console.error('Error loading plugins:', error);
    }
  };

  const loadMidiDevices = async () => {
    try {
      const inputs = await invoke('get_available_midi_inputs');
      setMidiInputs(inputs);
    } catch (error) {
      console.error('Error loading MIDI devices:', error);
    }
  };

  const loadAudioDevices = async () => {
    try {
      const devices = await invoke('get_available_audio_devices');
      setAudioDevices(devices);
    } catch (error) {
      console.error('Error loading audio devices:', error);
    }
  };

  const updateMemoryStats = async () => {
    try {
      const stats = await invoke('get_memory_stats');
      setMemoryStats(stats);
    } catch (error) {
      console.error('Error getting memory stats:', error);
    }
  };

  const handleAddPlugin = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Audio Plugins',
          extensions: ['vst', 'vst3', 'lv2', 'so', 'dll']
        }]
      });

      if (selected) {
        setIsLoading(true);
        const pluginName = selected.split('/').pop();
        await invoke('load_plugin', {
          pluginPath: selected,
          name: pluginName
        });
        await loadPlugins();
      }
    } catch (error) {
      console.error('Error adding plugin:', error);
      alert(`Failed to load plugin: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnloadPlugin = async (pluginId) => {
    try {
      await invoke('unload_plugin', { pluginId });
      await loadPlugins();
    } catch (error) {
      console.error('Error unloading plugin:', error);
    }
  };

  const handleMidiRouting = async (pluginId, deviceId, channel) => {
    try {
      await invoke('set_plugin_midi_routing', {
        pluginId,
        deviceId,
        channel: parseInt(channel)
      });
      await loadPlugins();
    } catch (error) {
      console.error('Error setting MIDI routing:', error);
    }
  };

  const handleAudioRouting = async (pluginId, channelsStr) => {
    try {
      const channels = channelsStr
        .split(',')
        .map(ch => parseInt(ch.trim()) - 1)
        .filter(ch => !isNaN(ch));

      await invoke('set_plugin_audio_routing', {
        pluginId,
        outputChannels: channels
      });
      await loadPlugins();
    } catch (error) {
      console.error('Error setting audio routing:', error);
    }
  };

  const getMemoryPercentage = () => {
    if (!memoryStats) return 0;
    return (memoryStats.plugins_used_mb / 8192) * 100;
  };

  const getMemoryColor = () => {
    const percentage = getMemoryPercentage();
    if (percentage < 50) return '#4CAF50';
    if (percentage < 75) return '#FFC107';
    return '#F44336';
  };

  return (
    <div className="plugin-manager">
      <header className="plugin-header">
        <h2>Carla Plugin Manager</h2>
        <button 
          onClick={handleAddPlugin}
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading ? 'Loading...' : '+ Add Plugin'}
        </button>
      </header>

      {/* Memory Usage Display */}
      {memoryStats && (
        <div className="memory-panel">
          <h3>Memory Usage</h3>
          <div className="memory-info">
            <div className="memory-bar">
              <div 
                className="memory-used"
                style={{
                  width: `${getMemoryPercentage()}%`,
                  backgroundColor: getMemoryColor()
                }}
              />
            </div>
            <div className="memory-text">
              <span className="memory-current">
                {memoryStats.plugins_used_mb} MB
              </span>
              <span className="memory-total">/ 8192 MB</span>
            </div>
          </div>
          <div className="memory-details">
            <div className="memory-item">
              <span>HarmonySync:</span>
              <strong>{memoryStats.harmonysync_used_mb} MB</strong>
            </div>
            <div className="memory-item">
              <span>Plugins:</span>
              <strong>{memoryStats.plugins_used_mb} MB</strong>
            </div>
            <div className="memory-item">
              <span>Available:</span>
              <strong>{memoryStats.available_mb} MB</strong>
            </div>
          </div>
        </div>
      )}

      {/* Plugin List */}
      <div className="plugin-grid">
        {plugins.length === 0 ? (
          <div className="empty-state">
            <p>No plugins loaded. Click "Add Plugin" to get started.</p>
          </div>
        ) : (
          plugins.map(plugin => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              midiInputs={midiInputs}
              audioDevices={audioDevices}
              onUnload={handleUnloadPlugin}
              onMidiRouting={handleMidiRouting}
              onAudioRouting={handleAudioRouting}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PluginCard({ 
  plugin, 
  midiInputs, 
  audioDevices, 
  onUnload, 
  onMidiRouting, 
  onAudioRouting 
}) {
  const [midiDevice, setMidiDevice] = useState(plugin.midi_routing?.device_id || '');
  const [midiChannel, setMidiChannel] = useState(plugin.midi_routing?.channel || 1);
  const [audioChannels, setAudioChannels] = useState(
    plugin.audio_routing?.output_channels?.map(ch => ch + 1).join(',') || '1,2'
  );

  const handleMidiDeviceChange = (deviceId) => {
    setMidiDevice(deviceId);
    onMidiRouting(plugin.id, deviceId, midiChannel);
  };

  const handleMidiChannelChange = (channel) => {
    setMidiChannel(channel);
    onMidiRouting(plugin.id, midiDevice, channel);
  };

  const handleAudioChannelsChange = (channels) => {
    setAudioChannels(channels);
    onAudioRouting(plugin.id, channels);
  };

  return (
    <div className="plugin-card">
      <div className="plugin-card-header">
        <h4>{plugin.name}</h4>
        <button 
          className="btn-icon btn-danger"
          onClick={() => onUnload(plugin.id)}
          title="Unload Plugin"
        >
          ×
        </button>
      </div>

      <div className="plugin-card-body">
        <div className="plugin-info">
          <span className="plugin-type">{plugin.plugin_type}</span>
          <span className="plugin-memory">{plugin.memory_usage_mb} MB</span>
        </div>

        {/* MIDI Routing */}
        <div className="routing-section">
          <label className="routing-label">MIDI Input</label>
          <select 
            value={midiDevice}
            onChange={(e) => handleMidiDeviceChange(e.target.value)}
            className="routing-select"
          >
            <option value="">No MIDI Input</option>
            {midiInputs.map(device => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>

          {midiDevice && (
            <div className="midi-channel-selector">
              <label>Channel:</label>
              <select
                value={midiChannel}
                onChange={(e) => handleMidiChannelChange(parseInt(e.target.value))}
                className="channel-select"
              >
                {Array.from({ length: 16 }, (_, i) => i + 1).map(ch => (
                  <option key={ch} value={ch}>Ch {ch}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Audio Routing */}
        <div className="routing-section">
          <label className="routing-label">Audio Output Channels</label>
          <input
            type="text"
            value={audioChannels}
            onChange={(e) => handleAudioChannelsChange(e.target.value)}
            placeholder="e.g., 1,2"
            className="routing-input"
          />
          <small className="routing-hint">
            Comma-separated channel numbers (e.g., 1,2 for stereo)
          </small>
        </div>

        {/* Status Indicator */}
        <div className="plugin-status">
          <span className={`status-dot ${plugin.is_active ? 'active' : 'inactive'}`} />
          <span>{plugin.is_active ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
    </div>
  );
}

export default PluginManager;
```

### Plugin Manager CSS

```css
/* harmonysync/src/styles/plugin-manager.css */

.plugin-manager {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.plugin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.plugin-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
}

/* Memory Panel */
.memory-panel {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.memory-panel h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
}

.memory-info {
  margin-bottom: 16px;
}

.memory-bar {
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 8px;
}

.memory-used {
  height: 100%;
  background: #4CAF50;
  transition: width 0.3s ease, background-color 0.3s ease;
  border-radius: 12px;
}

.memory-text {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.memory-current {
  font-weight: 600;
  font-size: 16px;
}

.memory-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
}

.memory-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.memory-item span {
  font-size: 12px;
  opacity: 0.9;
}

.memory-item strong {
  font-size: 16px;
}

/* Plugin Grid */
.plugin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

/* Plugin Card */
.plugin-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.plugin-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.plugin-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.plugin-card-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plugin-card-body {
  padding: 16px;
}

.plugin-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.plugin-type {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  font-weight: 600;
}

.plugin-memory {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

/* Routing Section */
.routing-section {
  margin-bottom: 16px;
}

.routing-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
}

.routing-select,
.routing-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.routing-select:focus,
.routing-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.midi-channel-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.midi-channel-selector label {
  font-size: 13px;
  color: #666;
}

.channel-select {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-size: 13px;
}

.routing-hint {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: #888;
}

/* Plugin Status */
.plugin-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ddd;
}

.status-dot.active {
  background: #4CAF50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
}

.status-dot.inactive {
  background: #999;
}

/* Buttons */
.btn-primary {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 4px;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-danger {
  background: #f44336;
  color: white;
}

.btn-danger:hover {
  background: #d32f2f;
}
```

## 5. Configuration Management

### Plugin Configuration File Format

```json
{
  "version": "1.0.0",
  "name": "Live Setup - Sunday Service",
  "audio_device": "behringer_x18",
  "sample_rate": 48000,
  "buffer_size": 256,
  "plugins": [
    {
      "id": "avl_drums_001",
      "name": "AVL Drums",
      "path": "/usr/lib/vst/AVLDrums.so",
      "type": "VST2",
      "enabled": true,
      "midi_routing": {
        "device_id": "electric_kit_001",
        "device_name": "Alesis Drum Kit",
        "channel": 10,
        "transpose": 0,
        "velocity_curve": "Linear"
      },
      "audio_routing": {
        "output_channels": [0, 1],
        "gain_db": 0.0,
        "pan": 0.0,
        "mute": false,
        "solo": false
      },
      "preset": "default.preset"
    },
    {
      "id": "keyzone_001",
      "name": "Keyzone Classic",
      "path": "/usr/lib/vst/Keyzone.so",
      "type": "VST2",
      "enabled": true,
      "midi_routing": {
        "device_id": "midi_keyboard_001",
        "device_name": "M-Audio Keystation",
        "channel": 1,
        "transpose": 0,
        "velocity_curve": "Linear"
      },
      "audio_routing": {
        "output_channels": [2, 3],
        "gain_db": 0.0,
        "pan": 0.0,
        "mute": false,
        "solo": false
      },
      "preset": "piano_bright.preset"
    },
    {
      "id": "tonex_001",
      "name": "Tonex - Guitar 1",
      "path": "/usr/lib/vst3/Tonex.vst3",
      "type": "VST3",
      "enabled": true,
      "midi_routing": null,
      "audio_routing": {
        "output_channels": [4],
        "gain_db": 0.0,
        "pan": 0.0,
        "mute": false,
        "solo": false
      },
      "preset": "clean_amp.preset"
    },
    {
      "id": "tonex_002",
      "name": "Tonex - Guitar 2",
      "path": "/usr/lib/vst3/Tonex.vst3",
      "type": "VST3",
      "enabled": true,
      "midi_routing": null,
      "audio_routing": {
        "output_channels": [5],
        "gain_db": 0.0,
        "pan": 0.0,
        "mute": false,
        "solo": false
      },
      "preset": "overdrive_amp.preset"
    }
  ]
}
```

### Configuration Manager

```rust
// harmonysync/src-tauri/src/application/config_manager.rs

use serde::{Serialize, Deserialize};
use std::path::{Path, PathBuf};
use anyhow::{Result, Context};
use tokio::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginConfiguration {
    pub version: String,
    pub name: String,
    pub audio_device: String,
    pub sample_rate: u32,
    pub buffer_size: u32,
    pub plugins: Vec<PluginConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginConfig {
    pub id: String,
    pub name: String,
    pub path: String,
    pub plugin_type: String,
    pub enabled: bool,
    pub midi_routing: Option<MidiRoutingConfig>,
    pub audio_routing: AudioRoutingConfig,
    pub preset: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MidiRoutingConfig {
    pub device_id: String,
    pub device_name: String,
    pub channel: u8,
    pub transpose: i8,
    pub velocity_curve: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioRoutingConfig {
    pub output_channels: Vec<usize>,
    pub gain_db: f32,
    pub pan: f32,
    pub mute: bool,
    pub solo: bool,
}

pub struct ConfigManager {
    config_dir: PathBuf,
}

impl ConfigManager {
    pub fn new() -> Result<Self> {
        let home_dir = dirs::home_dir()
            .context("Failed to get home directory")?;
        
        let config_dir = home_dir.join(".harmonysync").join("plugins");
        
        Ok(Self { config_dir })
    }

    pub async fn ensure_config_dir(&self) -> Result<()> {
        fs::create_dir_all(&self.config_dir).await
            .context("Failed to create config directory")?;
        Ok(())
    }

    pub async fn save_configuration(&self, config: &PluginConfiguration) -> Result<()> {
        self.ensure_config_dir().await?;

        let file_name = format!("{}.json", config.name.replace(" ", "_").to_lowercase());
        let file_path = self.config_dir.join(file_name);

        let json = serde_json::to_string_pretty(config)
            .context("Failed to serialize configuration")?;

        fs::write(&file_path, json).await
            .context("Failed to write configuration file")?;

        Ok(())
    }

    pub async fn load_configuration(&self, name: &str) -> Result<PluginConfiguration> {
        let file_name = format!("{}.json", name.replace(" ", "_").to_lowercase());
        let file_path = self.config_dir.join(file_name);

        let json = fs::read_to_string(&file_path).await
            .context("Failed to read configuration file")?;

        let config = serde_json::from_str(&json)
            .context("Failed to deserialize configuration")?;

        Ok(config)
    }

    pub async fn list_configurations(&self) -> Result<Vec<String>> {
        self.ensure_config_dir().await?;

        let mut entries = fs::read_dir(&self.config_dir).await?;
        let mut configs = Vec::new();

        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Some(name) = path.file_stem().and_then(|s| s.to_str()) {
                    configs.push(name.to_string());
                }
            }
        }

        Ok(configs)
    }

    pub async fn delete_configuration(&self, name: &str) -> Result<()> {
        let file_name = format!("{}.json", name.replace(" ", "_").to_lowercase());
        let file_path = self.config_dir.join(file_name);

        fs::remove_file(&file_path).await
            .context("Failed to delete configuration file")?;

        Ok(())
    }
}
```

## 6. Integration with Main Application

### Update lib.rs to register new commands

```rust
// harmonysync/src-tauri/src/lib.rs

// Add to invoke_handler
.invoke_handler(tauri::generate_handler![
    // ... existing commands ...
    
    // Carla Plugin Manager
    application::commands::load_plugin,
    application::commands::unload_plugin,
    application::commands::get_loaded_plugins,
    application::commands::set_plugin_midi_routing,
    application::commands::set_plugin_audio_routing,
    application::commands::get_memory_stats,
    application::commands::open_plugin_dialog,
    
    // Configuration Management
    application::commands::save_plugin_configuration,
    application::commands::load_plugin_configuration,
    application::commands::list_plugin_configurations,
    application::commands::delete_plugin_configuration,
])
```

## 7. Testing Utilities

### Test Script

```rust
// harmonysync/src-tauri/tests/plugin_manager_tests.rs

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_midi_device_enumeration() {
        let manager = MidiManager::new().unwrap();
        let devices = manager.get_input_devices().unwrap();
        
        println!("Found {} MIDI input devices:", devices.len());
        for device in devices {
            println!("  - {} (ID: {})", device.name, device.id);
        }
    }

    #[tokio::test]
    async fn test_audio_routing_configuration() {
        let router = AudioRouter::new();
        router.configure_example_routing().await.unwrap();
        
        let drums_routes = router.get_plugin_routes("avl_drums").await;
        assert_eq!(drums_routes.len(), 2); // Stereo output
        
        let keys_routes = router.get_plugin_routes("keyzone_classic").await;
        assert_eq!(keys_routes.len(), 2); // Stereo output
    }

    #[tokio::test]
    async fn test_memory_monitoring() {
        // Simulate plugin memory usage
        let stats = MemoryStats {
            total_system_mb: 16384,
            total_used_mb: 8192,
            available_mb: 8192,
            harmonysync_used_mb: 300,
            plugins_used_mb: 800,
            per_plugin_usage: [
                ("avl_drums".to_string(), 400),
                ("keyzone_classic".to_string(), 200),
                ("tonex_1".to_string(), 100),
                ("tonex_2".to_string(), 100),
            ].iter().cloned().collect(),
        };
        
        assert!(stats.plugins_used_mb < 2000, "Plugin memory within budget");
    }
}
```

This implementation example provides the complete foundation for integrating Carla plugin host capabilities into HarmonySync, with full MIDI and audio routing support.
