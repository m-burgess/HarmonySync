# DMX Lighting Control Integration - Technical Research

## Executive Summary

**Research Question:** Is it feasible to integrate DMX512 lighting control into HarmonySync Presenter to provide church/worship lighting automation?

**Answer:** **YES - HIGHLY FEASIBLE** ✅

This document provides comprehensive technical research on integrating DMX512 lighting control capabilities into HarmonySync Presenter, enabling users to control stage, worship, and house lighting directly from the presentation software.

## 1. Project Overview

### 1.1 Problem Statement

Churches and worship venues currently use separate software (like Lightkey) to control lighting scenes. The user requests an all-in-one solution that includes:
- Folder-based presentations
- Multitrack audio player
- MIDI-controllable rack plugins (in progress)
- **DMX configuration and lighting scenes**

### 1.2 User Requirements

The user needs two primary lighting scenarios:
1. **Worship Mode**: 25% house lights + User-selected color lighting
2. **Sermon Mode**: 50% house lights + TV lighting (for broadcasting)
3. **Phillips Hue integration** for upstairs areas
4. **DMX control** for kids room (house + color lighting)

### 1.3 Use Cases

- Simple scene triggering (not complex programming)
- Macro-based automation (trigger lighting scenes from slides)
- Scheduled lighting changes (integration with existing scheduler)
- Manual scene selection from UI
- MIDI-triggered lighting (integration with existing MIDI support)

## 2. DMX512 Protocol Overview

### 2.1 What is DMX512?

DMX512 (Digital Multiplex with 512 pieces of information) is the industry-standard protocol for controlling stage lighting and effects.

**Key Characteristics:**
- **512 channels per universe**: Each universe can control up to 512 individual parameters
- **Multiple universes**: Modern controllers support multiple universes (512, 1024, 2048+ channels)
- **Unidirectional**: DMX flows one way (controller → fixtures)
- **RS-485 based**: Uses differential signaling over twisted pair cables
- **250 kbit/s**: Fast enough for real-time lighting control
- **44 Hz refresh rate**: Updates all 512 channels ~44 times per second

### 2.2 DMX Data Structure

```
Universe (512 channels)
├── Channel 1-6: RGB LED Par (Red, Green, Blue, Dimmer, Strobe, Mode)
├── Channel 7-12: RGB LED Par #2
├── Channel 13-16: Moving Head (Pan, Tilt, Dimmer, Color)
├── Channel 17-20: Dimmer Pack CH1 (House Lights)
├── Channel 21-24: Dimmer Pack CH2 (Stage Lights)
└── ...up to Channel 512
```

Each channel is a single byte (0-255) representing:
- Intensity (0 = off, 255 = full brightness)
- Color values (RGB: 0-255 each)
- Position (pan/tilt for moving heads)
- Effects (strobe speed, color macros)

### 2.3 DMX Addressing

**Example fixture addressing:**
```
Fixture Type: RGB LED Par
DMX Address: 1
Channels Used: 6
├── CH1 (DMX1): Red (0-255)
├── CH2 (DMX2): Green (0-255)
├── CH3 (DMX3): Blue (0-255)
├── CH4 (DMX4): Master Dimmer (0-255)
├── CH5 (DMX5): Strobe (0-255)
└── CH6 (DMX6): Mode (0-255)
```

## 3. Hardware Interface Options

### 3.1 USB DMX Interfaces

**Recommended: ENTTEC DMX USB PRO Mk2**
- **Price:** ~$200 USD
- **Universes:** 2 (1024 channels)
- **Connection:** USB 2.0
- **Latency:** <1ms
- **Driver:** FTDI-based (excellent Linux/Windows/Mac support)
- **API:** Simple serial protocol

**Budget Option: Generic USB-DMX512 Adapters**
- **Price:** ~$25-50 USD
- **Universes:** 1 (512 channels)
- **Connection:** USB 2.0
- **Reliability:** Variable (some work well, some don't)

### 3.2 Network-Based DMX (Art-Net/sACN)

**Art-Net Protocol**
- DMX over Ethernet/UDP
- **Advantages:**
  - No USB hardware required (software can output directly)
  - Multiple universes (limited only by network)
  - Long distances (standard Ethernet limits)
  - Industry standard
- **Disadvantages:**
  - Requires Art-Net → DMX converter hardware (~$100-300)
  - Network configuration complexity
  - More complex protocol

**sACN (Streaming ACN / E1.31)**
- Similar to Art-Net but open standard
- Better for large installations
- Multicast support for efficiency

### 3.3 Recommended Approach for HarmonySync

**Start with USB DMX Interface:**
1. Most churches already use USB interfaces (compatible with Lightkey)
2. Simpler protocol (serial-based)
3. Lower latency than network protocols
4. Easier to debug and troubleshoot

**Future Enhancement:**
- Add Art-Net/sACN support for advanced users
- Allows control of larger installations without USB limitations

## 4. Software Architecture

### 4.1 System Components

```
┌─────────────────────────────────────────────────────────┐
│                    HarmonySync UI                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │ Lighting │  │  Scene   │  │ Live Control Panel   │ │
│  │ Settings │  │ Manager  │  │ (Faders/Buttons)     │ │
│  └──────────┘  └──────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                         ↓ Tauri IPC
┌─────────────────────────────────────────────────────────┐
│              Rust Backend (Tauri)                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │         DMX Engine (Tokio async)                 │  │
│  │  • Scene storage & recall                        │  │
│  │  • Fixture definitions                           │  │
│  │  • Channel value management                      │  │
│  │  • Transition engine (fade in/out)               │  │
│  │  • Macro integration                             │  │
│  └──────────────────────────────────────────────────┘  │
│                         ↓                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │         DMX Driver Layer                         │  │
│  │  • USB interface (ENTTEC, generic)               │  │
│  │  • Art-Net (future)                              │  │
│  │  • sACN (future)                                 │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         ↓ Serial/USB
              ┌──────────────────┐
              │  DMX Interface   │
              │  (USB-DMX512)    │
              └──────────────────┘
                         ↓ XLR Cable
              ┌──────────────────┐
              │  Lighting        │
              │  Fixtures        │
              └──────────────────┘
```

### 4.2 Data Model

#### Scene Definition
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DmxScene {
    pub id: String,
    pub name: String,
    pub description: String,
    pub fixture_states: Vec<FixtureState>,
    pub fade_time_ms: u32,  // Transition duration
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FixtureState {
    pub fixture_id: String,
    pub channel_values: HashMap<String, u8>, // e.g., {"red": 255, "dimmer": 200}
}
```

#### Fixture Definition
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DmxFixture {
    pub id: String,
    pub name: String,
    pub fixture_type: String,  // e.g., "RGB LED Par"
    pub dmx_address: u16,      // Starting DMX address (1-512)
    pub channels: Vec<DmxChannel>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DmxChannel {
    pub name: String,          // e.g., "red", "green", "dimmer"
    pub channel_offset: u16,   // Offset from fixture address
    pub default_value: u8,
}
```

#### Universe State
```rust
pub struct DmxUniverse {
    pub universe_id: u8,
    pub channels: [u8; 512],   // Current values for all 512 channels
}
```

### 4.3 Database Schema

Add to existing SQLite database:

```sql
-- DMX Fixtures Table
CREATE TABLE dmx_fixtures (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    fixture_type TEXT NOT NULL,
    dmx_address INTEGER NOT NULL,
    universe INTEGER DEFAULT 1,
    channel_definitions TEXT NOT NULL,  -- JSON of channel definitions
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- DMX Scenes Table
CREATE TABLE dmx_scenes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    fade_time_ms INTEGER DEFAULT 1000,
    scene_data TEXT NOT NULL,  -- JSON of fixture states
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- DMX Scene Macros (link scenes to macros)
CREATE TABLE dmx_scene_macros (
    scene_id TEXT NOT NULL,
    macro_id INTEGER NOT NULL,
    FOREIGN KEY (scene_id) REFERENCES dmx_scenes(id),
    FOREIGN KEY (macro_id) REFERENCES macros(id),
    PRIMARY KEY (scene_id, macro_id)
);

-- DMX Settings
CREATE TABLE dmx_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

## 5. Implementation Details

### 5.1 Rust Dependencies

Add to `Cargo.toml`:
```toml
[dependencies]
# DMX USB Interface
serialport = "4.5"           # Serial port communication
ftdi = "0.1"                 # Optional: Direct FTDI chip access

# Art-Net (future)
artnet_protocol = "0.3"      # Art-Net packet encoding/decoding

# Utilities
tokio = { version = "1", features = ["full", "sync", "time"] }
tokio-serial = "5.4"         # Async serial port
```

### 5.2 DMX Engine Core (Rust)

```rust
use tokio::sync::{RwLock, mpsc};
use std::sync::Arc;
use std::time::Duration;

pub struct DmxEngine {
    universes: Arc<RwLock<Vec<DmxUniverse>>>,
    interface: Box<dyn DmxInterface>,
    tx_channel: mpsc::Sender<DmxCommand>,
}

pub enum DmxCommand {
    SetChannel { universe: u8, channel: u16, value: u8 },
    RecallScene { scene_id: String, fade_ms: u32 },
    SetFixture { fixture_id: String, values: HashMap<String, u8> },
    Stop,
}

impl DmxEngine {
    pub async fn new(interface_type: InterfaceType) -> Result<Self> {
        let interface = Self::create_interface(interface_type)?;
        let universes = Arc::new(RwLock::new(vec![DmxUniverse::new(1)]));
        let (tx, mut rx) = mpsc::channel(100);
        
        // Start background task for DMX output
        let universes_clone = universes.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_millis(22)); // ~45 Hz
            
            loop {
                interval.tick().await;
                
                // Process commands
                while let Ok(cmd) = rx.try_recv() {
                    match cmd {
                        DmxCommand::SetChannel { universe, channel, value } => {
                            let mut univs = universes_clone.write().await;
                            univs[universe as usize].channels[channel as usize] = value;
                        }
                        DmxCommand::RecallScene { scene_id, fade_ms } => {
                            // Load scene and fade to it
                        }
                        _ => {}
                    }
                }
                
                // Send DMX data to interface
                let univs = universes_clone.read().await;
                for universe in univs.iter() {
                    interface.send_universe(universe).await?;
                }
            }
        });
        
        Ok(Self {
            universes,
            interface,
            tx_channel: tx,
        })
    }
    
    pub async fn recall_scene(&self, scene: &DmxScene) -> Result<()> {
        self.tx_channel.send(DmxCommand::RecallScene {
            scene_id: scene.id.clone(),
            fade_ms: scene.fade_time_ms,
        }).await?;
        Ok(())
    }
}
```

### 5.3 USB DMX Interface Implementation

```rust
use serialport::{SerialPort, SerialPortBuilder};

pub struct EnttecUsbPro {
    port: Box<dyn SerialPort>,
}

impl EnttecUsbPro {
    pub fn new(port_name: &str) -> Result<Self> {
        let port = serialport::new(port_name, 57600)
            .timeout(Duration::from_millis(10))
            .data_bits(serialport::DataBits::Eight)
            .stop_bits(serialport::StopBits::One)
            .parity(serialport::Parity::None)
            .open()?;
        
        Ok(Self { port })
    }
    
    pub fn send_dmx(&mut self, universe: &DmxUniverse) -> Result<()> {
        // ENTTEC USB PRO protocol
        let mut packet = vec![
            0x7E,  // Start delimiter
            0x06,  // Label: Output DMX packet
            (512 & 0xFF) as u8,  // Data length LSB
            (512 >> 8) as u8,    // Data length MSB
            0x00,  // Start code
        ];
        
        // Add 512 DMX channel values
        packet.extend_from_slice(&universe.channels);
        packet.push(0xE7);  // End delimiter
        
        self.port.write_all(&packet)?;
        Ok(())
    }
}

impl DmxInterface for EnttecUsbPro {
    async fn send_universe(&self, universe: &DmxUniverse) -> Result<()> {
        // Implementation
    }
}
```

### 5.4 Scene Transition Engine

```rust
pub struct TransitionEngine {
    current_values: [u8; 512],
    target_values: [u8; 512],
    transition_progress: f32,  // 0.0 to 1.0
    transition_duration_ms: u32,
}

impl TransitionEngine {
    pub fn start_transition(&mut self, target_scene: &DmxScene) {
        // Store current values
        self.current_values.copy_from_slice(&self.get_current_universe_values());
        
        // Set target values from scene
        self.target_values = scene_to_universe_values(target_scene);
        
        // Reset progress
        self.transition_progress = 0.0;
        self.transition_duration_ms = target_scene.fade_time_ms;
    }
    
    pub fn update(&mut self, delta_time_ms: u32) -> [u8; 512] {
        if self.transition_progress >= 1.0 {
            return self.target_values;
        }
        
        self.transition_progress += (delta_time_ms as f32) / (self.transition_duration_ms as f32);
        self.transition_progress = self.transition_progress.min(1.0);
        
        // Linear interpolation (can be enhanced with easing functions)
        let mut output = [0u8; 512];
        for i in 0..512 {
            let current = self.current_values[i] as f32;
            let target = self.target_values[i] as f32;
            output[i] = (current + (target - current) * self.transition_progress) as u8;
        }
        
        output
    }
}
```

## 6. User Interface Components

### 6.1 Lighting Control Panel (React)

```jsx
// src/components/screens/LightingControl.jsx
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

export function LightingControl() {
  const [scenes, setScenes] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [activeScene, setActiveScene] = useState(null);
  
  useEffect(() => {
    loadScenes();
    loadFixtures();
  }, []);
  
  const loadScenes = async () => {
    const sceneList = await invoke('dmx_get_all_scenes');
    setScenes(sceneList);
  };
  
  const recallScene = async (sceneId) => {
    await invoke('dmx_recall_scene', { sceneId });
    setActiveScene(sceneId);
  };
  
  return (
    <div className="lighting-control">
      <h2>Lighting Scenes</h2>
      <div className="scene-buttons">
        {scenes.map(scene => (
          <button
            key={scene.id}
            className={activeScene === scene.id ? 'active' : ''}
            onClick={() => recallScene(scene.id)}
          >
            {scene.name}
          </button>
        ))}
      </div>
      
      <div className="fixture-controls">
        <h3>Live Control</h3>
        {fixtures.map(fixture => (
          <FixtureControl key={fixture.id} fixture={fixture} />
        ))}
      </div>
    </div>
  );
}
```

### 6.2 Scene Editor

```jsx
export function SceneEditor({ sceneId }) {
  const [scene, setScene] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  
  const updateFixtureValue = async (fixtureId, channel, value) => {
    // Update scene state
    const updatedScene = { ...scene };
    const fixtureState = updatedScene.fixture_states.find(
      f => f.fixture_id === fixtureId
    );
    fixtureState.channel_values[channel] = value;
    
    setScene(updatedScene);
    
    // Live preview
    await invoke('dmx_set_fixture_channel', {
      fixtureId,
      channel,
      value
    });
  };
  
  const saveScene = async () => {
    await invoke('dmx_save_scene', { scene });
  };
  
  return (
    <div className="scene-editor">
      <h2>Edit Scene: {scene?.name}</h2>
      
      {fixtures.map(fixture => (
        <div key={fixture.id} className="fixture-editor">
          <h3>{fixture.name}</h3>
          {fixture.channels.map(channel => (
            <div key={channel.name} className="channel-control">
              <label>{channel.name}</label>
              <input
                type="range"
                min="0"
                max="255"
                value={getChannelValue(fixture.id, channel.name)}
                onChange={(e) => updateFixtureValue(
                  fixture.id,
                  channel.name,
                  parseInt(e.target.value)
                )}
              />
              <span>{getChannelValue(fixture.id, channel.name)}</span>
            </div>
          ))}
        </div>
      ))}
      
      <button onClick={saveScene}>Save Scene</button>
    </div>
  );
}
```

### 6.3 Fixture Configuration UI

```jsx
export function FixtureConfiguration() {
  const [fixtures, setFixtures] = useState([]);
  const [fixtureTypes, setFixtureTypes] = useState([]);
  
  const addFixture = async (type, name, address) => {
    const fixture = await invoke('dmx_add_fixture', {
      fixtureType: type,
      name,
      dmxAddress: address
    });
    setFixtures([...fixtures, fixture]);
  };
  
  return (
    <div className="fixture-config">
      <h2>DMX Fixtures</h2>
      
      <div className="fixture-list">
        {fixtures.map(fixture => (
          <div key={fixture.id} className="fixture-item">
            <span>{fixture.name}</span>
            <span>Type: {fixture.fixture_type}</span>
            <span>Address: {fixture.dmx_address}</span>
            <button onClick={() => deleteFixture(fixture.id)}>Delete</button>
          </div>
        ))}
      </div>
      
      <div className="add-fixture">
        <h3>Add Fixture</h3>
        <select onChange={(e) => setSelectedType(e.target.value)}>
          {fixtureTypes.map(type => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
        </select>
        <input placeholder="Fixture Name" />
        <input type="number" placeholder="DMX Address (1-512)" />
        <button onClick={addFixture}>Add</button>
      </div>
    </div>
  );
}
```

## 7. Integration with Existing Features

### 7.1 Macro Integration

Extend existing macro system to support DMX scenes:

```rust
// In commands.rs
#[command]
pub async fn execute_macro(
    app_handle: AppHandle,
    macro_id: String,
    macro_action: String,
    midi_note: Option<u8>,
    dmx_scene_id: Option<String>,  // NEW
) -> Result<(), String> {
    match macro_action.as_str() {
        // ... existing actions ...
        
        "recall_dmx_scene" => {
            if let Some(scene_id) = dmx_scene_id {
                let dmx_engine = app_handle.state::<DmxEngine>();
                dmx_engine.recall_scene_by_id(&scene_id).await
                    .map_err(|e| format!("Failed to recall DMX scene: {}", e))?;
                Ok(())
            } else {
                Err("DMX scene ID is required for recall_dmx_scene action".to_string())
            }
        }
        
        _ => Err(format!("Unknown macro action: {}", macro_action))
    }
}
```

### 7.2 Scheduler Integration

Add DMX scene scheduling to existing scheduler:

```sql
-- Add to schedule_events table
ALTER TABLE schedule_events ADD COLUMN dmx_scene_id TEXT;
```

```jsx
// In SchedulerWindow.jsx
<optgroup label="DMX Scenes">
  {macros
    .filter(m => m.action === 'recall_dmx_scene')
    .map(m => (
      <option key={m.id} value={m.id}>
        {m.name}
      </option>
    ))}
</optgroup>
```

### 7.3 Slide Automation

Link DMX scenes to slides (similar to existing macro system):

```jsx
// In SlideManager.jsx
const handleSlideClick = async (slide) => {
  // ... existing code ...
  
  // Check for associated DMX scenes
  const dmxScenes = await invoke('get_dmx_scenes_for_slide', {
    slideId: slide.id
  });
  
  if (dmxScenes.length > 0) {
    // Recall first associated scene (or show selection dialog)
    await invoke('dmx_recall_scene', { sceneId: dmxScenes[0].id });
  }
};
```

## 8. Memory and Performance Analysis

### 8.1 Memory Usage Estimates

| Component | Memory Usage | Notes |
|-----------|-------------|-------|
| DMX Engine Core | 5-10 MB | Rust async runtime overhead |
| Universe Buffers (4x) | 2 KB | 4 universes × 512 bytes |
| Scene Storage (100 scenes) | 500 KB | ~5 KB per scene average |
| Fixture Definitions (50 fixtures) | 100 KB | ~2 KB per fixture |
| USB Driver Overhead | 5-10 MB | Serial port, FTDI drivers |
| **Total DMX System** | **10-25 MB** | **Negligible impact** |

### 8.2 CPU Performance

| Operation | CPU Impact | Frequency |
|-----------|-----------|-----------|
| DMX Output | <1% | 45 Hz (continuous) |
| Scene Recall | <1% | User-triggered |
| Transition Calculation | 1-2% | During fades only |
| USB Communication | <0.5% | Hardware-accelerated |

**Conclusion:** DMX control adds minimal CPU and memory overhead (<25 MB, <2% CPU).

### 8.3 System Requirements Impact

Current system requirements:
- **Minimum:** 8 GB RAM
- **Recommended:** 16 GB RAM

DMX addition:
- **Additional RAM:** <25 MB
- **Additional CPU:** <2%
- **USB Port:** 1 required
- **No change to system requirements needed** ✅

## 9. Fixture Library

### 9.1 Common Fixture Profiles

Pre-configured fixture definitions to include:

```rust
// RGB LED Par Can
pub fn rgb_led_par() -> FixtureDefinition {
    FixtureDefinition {
        id: "rgb_led_par_6ch",
        name: "RGB LED Par (6 Channel)",
        manufacturer: "Generic",
        channels: vec![
            Channel { name: "red", offset: 0 },
            Channel { name: "green", offset: 1 },
            Channel { name: "blue", offset: 2 },
            Channel { name: "dimmer", offset: 3 },
            Channel { name: "strobe", offset: 4 },
            Channel { name: "mode", offset: 5 },
        ],
        channel_count: 6,
    }
}

// RGBW LED Par
pub fn rgbw_led_par() -> FixtureDefinition {
    FixtureDefinition {
        id: "rgbw_led_par_8ch",
        name: "RGBW LED Par (8 Channel)",
        manufacturer: "Generic",
        channels: vec![
            Channel { name: "red", offset: 0 },
            Channel { name: "green", offset: 1 },
            Channel { name: "blue", offset: 2 },
            Channel { name: "white", offset: 3 },
            Channel { name: "dimmer", offset: 4 },
            Channel { name: "strobe", offset: 5 },
            Channel { name: "mode", offset: 6 },
            Channel { name: "speed", offset: 7 },
        ],
        channel_count: 8,
    }
}

// Moving Head Spot
pub fn moving_head_spot() -> FixtureDefinition {
    FixtureDefinition {
        id: "moving_head_spot_16ch",
        name: "Moving Head Spot (16 Channel)",
        manufacturer: "Generic",
        channels: vec![
            Channel { name: "pan", offset: 0 },
            Channel { name: "pan_fine", offset: 1 },
            Channel { name: "tilt", offset: 2 },
            Channel { name: "tilt_fine", offset: 3 },
            Channel { name: "pan_tilt_speed", offset: 4 },
            Channel { name: "dimmer", offset: 5 },
            Channel { name: "strobe", offset: 6 },
            Channel { name: "color_wheel", offset: 7 },
            Channel { name: "gobo_wheel", offset: 8 },
            Channel { name: "gobo_rotation", offset: 9 },
            Channel { name: "prism", offset: 10 },
            Channel { name: "focus", offset: 11 },
            Channel { name: "frost", offset: 12 },
            Channel { name: "iris", offset: 13 },
            Channel { name: "zoom", offset: 14 },
            Channel { name: "control", offset: 15 },
        ],
        channel_count: 16,
    }
}

// Dimmer Pack (4 channel)
pub fn dimmer_pack() -> FixtureDefinition {
    FixtureDefinition {
        id: "dimmer_pack_4ch",
        name: "Dimmer Pack (4 Channel)",
        manufacturer: "Generic",
        channels: vec![
            Channel { name: "channel_1", offset: 0 },
            Channel { name: "channel_2", offset: 1 },
            Channel { name: "channel_3", offset: 2 },
            Channel { name: "channel_4", offset: 3 },
        ],
        channel_count: 4,
    }
}
```

### 9.2 Fixture Library File Format

Store as JSON for easy editing:

```json
{
  "fixture_library_version": "1.0",
  "fixtures": [
    {
      "id": "rgb_led_par_6ch",
      "name": "RGB LED Par (6 Channel)",
      "manufacturer": "Generic",
      "channel_count": 6,
      "channels": [
        {"name": "red", "offset": 0, "type": "color"},
        {"name": "green", "offset": 1, "type": "color"},
        {"name": "blue", "offset": 2, "type": "color"},
        {"name": "dimmer", "offset": 3, "type": "intensity"},
        {"name": "strobe", "offset": 4, "type": "effect"},
        {"name": "mode", "offset": 5, "type": "mode"}
      ]
    }
  ]
}
```

## 10. Example Church Setup

### 10.1 Typical Worship Venue Lighting

**Fixtures:**
- 8× RGB LED Pars (stage wash) - 48 channels
- 2× RGBW LED Bars (uplight) - 16 channels
- 4× Dimmer channels (house lights) - 4 channels
- 2× Dimmer channels (TV lights) - 2 channels
- **Total: 70 channels** (plenty of room in 512-channel universe)

### 10.2 Scene Examples

**Scene 1: Pre-Service**
```json
{
  "name": "Pre-Service",
  "description": "House lights 50%, stage warm white 30%",
  "fade_time_ms": 2000,
  "fixtures": [
    {
      "fixture_id": "house_lights_1-4",
      "channels": {"dimmer": 128}
    },
    {
      "fixture_id": "stage_pars_1-8",
      "channels": {"red": 255, "green": 200, "blue": 150, "dimmer": 77}
    }
  ]
}
```

**Scene 2: Worship**
```json
{
  "name": "Worship",
  "description": "House 25%, stage blue/purple",
  "fade_time_ms": 3000,
  "fixtures": [
    {
      "fixture_id": "house_lights_1-4",
      "channels": {"dimmer": 64}
    },
    {
      "fixture_id": "stage_pars_1-8",
      "channels": {"red": 128, "green": 0, "blue": 255, "dimmer": 200}
    },
    {
      "fixture_id": "uplights_1-2",
      "channels": {"red": 255, "green": 0, "blue": 128, "white": 0, "dimmer": 180}
    }
  ]
}
```

**Scene 3: Sermon**
```json
{
  "name": "Sermon",
  "description": "House 50%, TV lights on, stage dimmed",
  "fade_time_ms": 2000,
  "fixtures": [
    {
      "fixture_id": "house_lights_1-4",
      "channels": {"dimmer": 128}
    },
    {
      "fixture_id": "tv_lights_1-2",
      "channels": {"dimmer": 255}
    },
    {
      "fixture_id": "stage_pars_1-8",
      "channels": {"red": 255, "green": 255, "blue": 255, "dimmer": 50}
    }
  ]
}
```

## 11. Phillips Hue Integration

### 11.1 Hue API Overview

Phillips Hue lights can be controlled via HTTP REST API:
- **Discovery:** mDNS or manual IP entry
- **Authentication:** Press bridge button → generate API key
- **Control:** Simple JSON POST requests

### 11.2 Integration Approach

```rust
// Add to dependencies
reqwest = { version = "0.11", features = ["json"] }

pub struct PhillipsHueController {
    bridge_ip: String,
    api_key: String,
    client: reqwest::Client,
}

impl PhillipsHueController {
    pub async fn set_light_color(&self, light_id: u8, hue: u16, sat: u8, bri: u8) -> Result<()> {
        let url = format!(
            "http://{}/api/{}/lights/{}/state",
            self.bridge_ip, self.api_key, light_id
        );
        
        let body = serde_json::json!({
            "on": true,
            "hue": hue,       // 0-65535
            "sat": sat,       // 0-254
            "bri": bri,       // 0-254
            "transitiontime": 10  // 1 second (10 × 100ms)
        });
        
        self.client.put(&url).json(&body).send().await?;
        Ok(())
    }
    
    pub async fn recall_scene(&self, scene_id: &str) -> Result<()> {
        let url = format!(
            "http://{}/api/{}/groups/0/action",
            self.bridge_ip, self.api_key
        );
        
        let body = serde_json::json!({
            "scene": scene_id
        });
        
        self.client.put(&url).json(&body).send().await?;
        Ok(())
    }
}
```

### 11.3 Unified Lighting Controller

Combine DMX and Hue into single interface:

```rust
pub struct UnifiedLightingController {
    dmx_engine: DmxEngine,
    hue_controller: Option<PhillipsHueController>,
}

impl UnifiedLightingController {
    pub async fn recall_unified_scene(&self, scene: &UnifiedScene) -> Result<()> {
        // Apply DMX part
        if let Some(dmx_scene) = &scene.dmx_scene {
            self.dmx_engine.recall_scene(dmx_scene).await?;
        }
        
        // Apply Hue part
        if let Some(hue_scene_id) = &scene.hue_scene_id {
            if let Some(hue) = &self.hue_controller {
                hue.recall_scene(hue_scene_id).await?;
            }
        }
        
        Ok(())
    }
}
```

## 12. Testing Strategy

### 12.1 Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_scene_transition() {
        let mut engine = TransitionEngine::new();
        let scene = create_test_scene();
        
        engine.start_transition(&scene);
        
        // Test initial state
        assert_eq!(engine.transition_progress, 0.0);
        
        // Test halfway through
        engine.update(500); // 500ms of 1000ms fade
        assert!((engine.transition_progress - 0.5).abs() < 0.01);
        
        // Test completion
        engine.update(500);
        assert_eq!(engine.transition_progress, 1.0);
    }
    
    #[test]
    fn test_fixture_addressing() {
        let fixture = rgb_led_par();
        fixture.dmx_address = 10;
        
        assert_eq!(fixture.get_absolute_channel("red"), 10);
        assert_eq!(fixture.get_absolute_channel("green"), 11);
        assert_eq!(fixture.get_absolute_channel("dimmer"), 13);
    }
}
```

### 12.2 Integration Tests

```rust
#[tokio::test]
async fn test_dmx_engine_integration() {
    let engine = DmxEngine::new(InterfaceType::Mock).await.unwrap();
    
    // Add fixture
    let fixture = create_test_fixture();
    engine.add_fixture(fixture).await.unwrap();
    
    // Create and recall scene
    let scene = create_test_scene();
    engine.recall_scene(&scene).await.unwrap();
    
    // Verify universe state
    let universe = engine.get_universe(1).await;
    assert_eq!(universe.channels[10], 255); // Red channel
}
```

### 12.3 Manual Testing Checklist

- [ ] USB interface detection and connection
- [ ] Fixture configuration and addressing
- [ ] Scene creation and editing
- [ ] Scene recall and transitions
- [ ] Macro integration (trigger scenes from slides)
- [ ] Scheduler integration (timed scene changes)
- [ ] MIDI integration (trigger scenes from MIDI notes)
- [ ] Multi-universe support (if applicable)
- [ ] Phillips Hue integration (if configured)
- [ ] Error handling (unplugged interface, invalid addresses)

## 13. Security and Safety Considerations

### 13.1 Electrical Safety

**DMX is low voltage (5V signal), but connected fixtures may be high voltage:**
- Always follow proper electrical codes for venue lighting
- Use licensed electricians for permanent installations
- Ensure proper grounding of all equipment
- Use appropriate circuit breakers and protection

### 13.2 Software Safety

```rust
// Implement emergency blackout
pub async fn emergency_blackout(&self) {
    let mut universes = self.universes.write().await;
    for universe in universes.iter_mut() {
        universe.channels = [0; 512];  // All lights off
    }
}

// Implement maximum output limiting
pub fn set_channel_with_limit(&mut self, channel: u16, value: u8) {
    let limited_value = value.min(self.max_output_limit);
    self.channels[channel as usize] = limited_value;
}
```

### 13.3 Access Control

- Lighting controls should require appropriate permissions
- Consider implementing "operator" vs "admin" modes
- Protect fixture configuration from accidental changes during service

## 14. Documentation and Training

### 14.1 User Documentation Needed

1. **Quick Start Guide**: First-time setup for common hardware
2. **Fixture Setup Guide**: How to add and configure fixtures
3. **Scene Creation Tutorial**: Step-by-step scene programming
4. **Macro Integration Guide**: Linking scenes to slides/macros
5. **Troubleshooting Guide**: Common issues and solutions

### 14.2 Video Tutorials (Recommended)

1. "Setting up DMX in 5 minutes"
2. "Creating your first lighting scene"
3. "Automating worship lighting"
4. "Common fixture profiles and addressing"

## 15. Implementation Roadmap

### 15.1 Phase 1: Core DMX Engine (2-3 weeks)

**Week 1:**
- [ ] DMX engine core structure
- [ ] Universe management
- [ ] Basic USB DMX interface support (ENTTEC)
- [ ] Scene data model and storage

**Week 2:**
- [ ] Transition engine with fading
- [ ] Database schema and migrations
- [ ] Fixture library (5-10 common types)
- [ ] Basic Tauri commands

**Week 3:**
- [ ] Unit tests and integration tests
- [ ] Error handling and recovery
- [ ] Interface auto-detection
- [ ] Mock interface for development

### 15.2 Phase 2: User Interface (2 weeks)

**Week 4:**
- [ ] Lighting control panel UI
- [ ] Scene recall buttons
- [ ] Scene editor (basic)
- [ ] Fixture configuration UI

**Week 5:**
- [ ] Live fixture control sliders
- [ ] Color picker for RGB fixtures
- [ ] Scene copy/paste/duplicate
- [ ] UI polish and feedback

### 15.3 Phase 3: Integration (1-2 weeks)

**Week 6:**
- [ ] Macro system integration
- [ ] Slide automation (scenes on slides)
- [ ] Scheduler integration
- [ ] MIDI trigger support

**Week 7 (optional):**
- [ ] Phillips Hue integration
- [ ] Art-Net support (basic)
- [ ] Advanced scene editor features
- [ ] Performance optimization

### 15.4 Phase 4: Documentation and Testing (1 week)

**Week 8:**
- [ ] User documentation
- [ ] Video tutorials (scripts)
- [ ] Testing with real hardware
- [ ] Bug fixes and refinement

**Total Estimated Time: 6-8 weeks**

## 16. Cost Analysis

### 16.1 Hardware Costs

| Item | Cost (USD) | Notes |
|------|-----------|-------|
| ENTTEC DMX USB PRO | $200 | Professional, reliable |
| Generic USB-DMX interface | $25-50 | Budget option, may be less reliable |
| XLR cables (3-pin) | $10-20 each | Standard DMX cables |
| DMX terminator | $10 | Recommended for long cable runs |
| **Minimum Setup** | **$45** | Generic interface + 2 cables |
| **Recommended Setup** | **$240** | ENTTEC + 3 cables + terminator |

### 16.2 Software Development Costs

Assuming developer rate of $75/hr:

| Phase | Hours | Cost |
|-------|-------|------|
| Phase 1: Core Engine | 80-120 | $6,000-9,000 |
| Phase 2: UI | 60-80 | $4,500-6,000 |
| Phase 3: Integration | 40-60 | $3,000-4,500 |
| Phase 4: Documentation | 30-40 | $2,250-3,000 |
| **Total** | **210-300** | **$15,750-22,500** |

### 16.3 ROI for Users

**Alternative Solutions:**
- Lightkey: $800+ (software)
- QLC+: Free (but complex, separate application)
- MagicQ: Free for small systems (but very complex)
- GrandMA: $10,000+ (professional consoles)

**Value Proposition:**
- **Integrated solution**: No separate lighting software needed
- **Simplified workflow**: Control everything from one application
- **Lower training costs**: Familiar interface
- **Automation**: Link lighting to presentations automatically

## 17. Limitations and Future Enhancements

### 17.1 Initial Release Limitations

**Not Included in v1:**
- Advanced effects (chases, rainbows, etc.)
- Timeline-based programming
- Live audio reactive lighting
- Pixel mapping for LED strips
- Multi-user collaboration
- Cloud sync for scenes

### 17.2 Future Enhancement Ideas

**Phase 2 Features (Future):**
1. **Effects Engine**: Pre-built color chases, strobes, etc.
2. **Audio Reactivity**: Lights respond to music
3. **Timeline Editor**: Program complex lighting cues on a timeline
4. **Pixel Mapper**: Control LED strips and matrices
5. **Art-Net/sACN**: Network-based DMX for large venues
6. **MIDI/OSC Control**: Control from external lighting consoles
7. **Cloud Library**: Share scenes with other venues
8. **Multi-user**: Multiple operators on same system

**Phase 3 Features (Advanced):**
1. **Lighting Visualization**: 3D preview of lighting (like Capture/WYSIWYG)
2. **Fixture Tracking**: Sync moving lights to on-screen content
3. **Automated Focus**: Point lights at specific stage areas
4. **Integration with Video**: Coordinate lighting with video playback

## 18. Comparison with Existing Solutions

### 18.1 vs. Lightkey

| Feature | Lightkey | HarmonySync DMX |
|---------|----------|-----------------|
| Price | $800+ | Included |
| Learning Curve | Moderate | Low (integrated) |
| Integration | External software | Native |
| Slide Automation | Manual sync required | Automatic |
| MIDI Control | Yes | Yes |
| Scheduler | Limited | Full integration |
| Effects | Advanced | Basic (v1) |
| Best For | Dedicated lighting operator | Church volunteers |

### 18.2 vs. QLC+

| Feature | QLC+ | HarmonySync DMX |
|---------|------|-----------------|
| Price | Free | Included |
| Learning Curve | High (complex UI) | Low |
| Integration | None | Native |
| Scene Recall | Manual | Automated |
| Effects | Advanced | Basic (v1) |
| Best For | Technical users | Church volunteers |

### 18.3 Competitive Advantages

**HarmonySync DMX Strengths:**
1. **Integrated Workflow**: Control presentations, audio, and lighting from one app
2. **Simplified UI**: Designed for volunteers, not lighting techs
3. **Automation**: Scenes trigger automatically with slides
4. **Lower Training**: Familiar interface, consistent design
5. **Budget-Friendly**: No additional software licenses
6. **Schedule Integration**: Timed lighting changes built-in

## 19. Risk Assessment

### 19.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| USB driver issues | Medium | High | Support multiple interfaces, mock mode |
| DMX timing problems | Low | Medium | Use proven libraries, thorough testing |
| Multi-platform support | Medium | Medium | Test on Windows/Mac/Linux early |
| Performance impact | Low | Low | DMX uses minimal resources |
| Hardware compatibility | Medium | High | Extensive device testing, documentation |

### 19.2 User Experience Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Too complex for beginners | Medium | High | Simplified UI, good defaults, tutorials |
| Not powerful enough for pros | Low | Low | Target audience is churches, not pro LDs |
| Configuration difficulty | Medium | High | Wizard-based setup, fixture library |

### 19.3 Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Limited market interest | Low | Medium | User request suggests demand |
| Support burden | Medium | Medium | Good documentation, common fixtures only |
| Hardware warranty issues | Low | Low | Don't sell hardware, recommend trusted brands |

## 20. Conclusion and Recommendations

### 20.1 Feasibility Assessment

**VERDICT: HIGHLY FEASIBLE** ✅

**Reasons:**
1. **Proven Technology**: DMX512 is mature and well-documented
2. **Minimal Resources**: <25 MB RAM, <2% CPU
3. **Simple Protocol**: Serial communication, straightforward implementation
4. **Strong Demand**: User requests align with church/worship market needs
5. **Competitive Advantage**: No integrated solution currently exists
6. **Existing Infrastructure**: Can leverage existing macro, scheduler, and MIDI systems

### 20.2 Recommended Approach

**Start Simple, Expand Later:**

1. **MVP (Minimum Viable Product):**
   - USB DMX interface support (ENTTEC + generic)
   - Basic scene storage and recall
   - 10-15 common fixture profiles
   - Simple UI with scene buttons
   - Macro integration
   - **Timeline: 4-6 weeks**

2. **Phase 2 Enhancements:**
   - Phillips Hue integration
   - Advanced scene editor
   - Live control panel
   - More fixture profiles
   - **Timeline: +2-3 weeks**

3. **Phase 3 Advanced Features:**
   - Art-Net/sACN support
   - Effects engine
   - Timeline editor
   - **Timeline: +3-4 weeks**

### 20.3 Next Steps

**Immediate Actions:**
1. Approve project scope and timeline
2. Acquire hardware for testing (ENTTEC DMX USB PRO recommended)
3. Survey target users for fixture requirements
4. Begin Phase 1 development

**Development Priorities:**
1. Core engine stability
2. User-friendly interface
3. Integration with existing features
4. Comprehensive documentation

### 20.4 Success Criteria

**Technical Success:**
- [ ] Stable DMX output (no flicker, <1ms latency)
- [ ] Support 2+ USB interfaces
- [ ] Scene recall in <2 seconds
- [ ] Smooth transitions (fade times accurate to ±100ms)
- [ ] Memory usage <25 MB

**User Success:**
- [ ] Setup wizard takes <10 minutes
- [ ] Non-technical users can create scenes
- [ ] Scenes integrate seamlessly with presentations
- [ ] No additional hardware beyond USB interface
- [ ] Positive user feedback from beta testers

### 20.5 Final Recommendation

**PROCEED WITH IMPLEMENTATION** ✅

DMX integration is:
- ✅ **Technically feasible** with existing technology
- ✅ **Resource-efficient** (<25 MB RAM, <2% CPU)
- ✅ **User-aligned** with target market needs
- ✅ **Competitively advantageous** (no integrated solutions exist)
- ✅ **Financially viable** (reasonable development cost)
- ✅ **Architecturally sound** (integrates cleanly with existing systems)

**The integration of DMX lighting control into HarmonySync will provide significant value to church and worship venues, creating a truly all-in-one presentation solution as requested by the user.**

---

**Document Version:** 1.0  
**Date:** 2025-10-24  
**Author:** HarmonySync Development Team  
**Status:** Research Complete - Awaiting Approval
