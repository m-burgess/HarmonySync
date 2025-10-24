# DMX Lighting Control - Visual Diagrams

This document provides visual representations of the DMX lighting system architecture, data flow, and user interface mockups.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Flow Diagrams](#data-flow-diagrams)
3. [Database Schema](#database-schema)
4. [Hardware Topology](#hardware-topology)
5. [User Interface Mockups](#user-interface-mockups)
6. [Scene State Machine](#scene-state-machine)
7. [Memory Layout](#memory-layout)
8. [Timing Diagrams](#timing-diagrams)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                     (React Components)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │   Lighting   │  │    Scene     │  │  Fixture Config      │ │
│  │   Control    │  │   Editor     │  │  Panel               │ │
│  │   Panel      │  │              │  │                      │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Live Control │  │   Settings   │  │  Scene List          │ │
│  │   Faders     │  │   Dialog     │  │                      │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Tauri IPC (JSON-RPC)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      RUST BACKEND (Tauri)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                     DMX Engine Core                        │ │
│  │  • Universe Management (1-4 universes)                    │ │
│  │  • Scene Storage & Recall                                 │ │
│  │  • Transition Engine (Fading)                             │ │
│  │  • Fixture Manager                                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              ↓                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   Integration Layer                        │ │
│  │  • Macro System ←→ DMX Scenes                             │ │
│  │  • Scheduler ←→ DMX Scenes                                │ │
│  │  • MIDI Events ←→ DMX Scenes                              │ │
│  │  • Slide Manager ←→ DMX Scenes                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              ↓                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                     DMX Driver Layer                       │ │
│  │  • USB-DMX (ENTTEC, Generic)                              │ │
│  │  • Art-Net (future)                                       │ │
│  │  • sACN (future)                                          │ │
│  │  • Mock Driver (testing)                                  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              ↓                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Database (SQLite)                       │ │
│  │  • Fixtures                                               │ │
│  │  • Scenes                                                 │ │
│  │  • Scene-Macro Links                                      │ │
│  │  • Settings                                               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Serial/USB Connection
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       HARDWARE LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐                                          │
│  │  USB DMX         │                                          │
│  │  Interface       │                                          │
│  │  (ENTTEC, etc.)  │                                          │
│  └──────────────────┘                                          │
│          ↓                                                      │
│   XLR Cable (DMX512)                                           │
│          ↓                                                      │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │   Fixture 1      │→ │   Fixture 2      │ → ...             │
│  │   (RGB LED Par)  │  │   (RGBW LED Bar) │                   │
│  └──────────────────┘  └──────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Component Interaction

```
┌────────────────┐
│   User Action  │ (Click "Worship" scene button)
└────────┬───────┘
         ↓
┌────────────────────────────────────────┐
│  Frontend (React)                      │
│  invoke('dmx_recall_scene', {          │
│    sceneId: 'worship-blue-purple'      │
│  })                                    │
└────────┬───────────────────────────────┘
         ↓ Tauri IPC
┌────────────────────────────────────────┐
│  Rust Backend Command Handler          │
│  #[command]                            │
│  async fn dmx_recall_scene(...)        │
└────────┬───────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  DMX Engine                            │
│  1. Load scene from database           │
│  2. Start transition engine            │
│  3. Calculate channel values           │
└────────┬───────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  Transition Engine                     │
│  For each frame (45 Hz):               │
│    - Interpolate values                │
│    - Update universe buffer            │
│    - Send to driver                    │
└────────┬───────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  DMX Driver (USB)                      │
│  Format DMX packet:                    │
│    [Start][Label][Data][End]           │
│  Write to serial port                  │
└────────┬───────────────────────────────┘
         ↓ USB/Serial
┌────────────────────────────────────────┐
│  USB DMX Interface                     │
│  Convert to DMX512 electrical signal   │
└────────┬───────────────────────────────┘
         ↓ XLR Cable
┌────────────────────────────────────────┐
│  Lighting Fixtures                     │
│  Update RGB/Dimmer values              │
│  Lights change color/intensity         │
└────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Scene Recall Flow

```
                    ┌──────────────┐
                    │  User clicks │
                    │    scene     │
                    │    button    │
                    └──────┬───────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│                 Scene Recall Process                     │
└──────────────────────────────────────────────────────────┘
                           ↓
                    ┌──────────────┐
                    │ Load scene   │
                    │ from DB      │
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │ Parse scene  │
                    │ fixture data │
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │ Convert to   │
                    │ universe     │
                    │ channels     │
                    └──────┬───────┘
                           ↓
         ┌─────────────────┴─────────────────┐
         ↓                                   ↓
┌─────────────────┐              ┌────────────────────┐
│ Start Immediate │              │ Start Fade         │
│ (fade_time=0)   │              │ (fade_time>0)      │
└────────┬────────┘              └─────────┬──────────┘
         │                                  │
         │                                  ↓
         │                       ┌────────────────────┐
         │                       │ Transition Engine: │
         │                       │ For each frame:    │
         │                       │  • Interpolate     │
         │                       │  • Update buffer   │
         │                       │  • Send DMX        │
         │                       └─────────┬──────────┘
         │                                  │
         └──────────────┬───────────────────┘
                        ↓
              ┌────────────────────┐
              │ Update universe    │
              │ buffer             │
              │ [512 bytes]        │
              └─────────┬──────────┘
                        ↓
              ┌────────────────────┐
              │ Send to DMX        │
              │ interface          │
              └─────────┬──────────┘
                        ↓
              ┌────────────────────┐
              │ Fixtures update    │
              │ Lights change      │
              └────────────────────┘
```

### Macro Integration Flow

```
┌──────────────────┐
│ User clicks      │
│ presentation     │
│ slide            │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Check for        │
│ associated       │
│ macros           │
└────────┬─────────┘
         ↓
         ├──→ No macros found → Continue normally
         │
         ↓ Macros found
┌──────────────────┐
│ Execute each     │
│ macro            │
└────────┬─────────┘
         ↓
         ├──→ play_youtube_playlist → Start music
         ├──→ send_midi_note → Send MIDI
         ├──→ recall_dmx_scene → Change lighting ← NEW
         └──→ ...
```

### Database Read/Write Flow

```
┌─────────────────────────────────────────────────────┐
│                   Database Schema                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │           dmx_fixtures                       │  │
│  │  id | name | type | address | channels      │  │
│  └──────────────────────────────────────────────┘  │
│                       ↓                             │
│  ┌──────────────────────────────────────────────┐  │
│  │           dmx_scenes                         │  │
│  │  id | name | fade_time | scene_data         │  │
│  └──────────────────────────────────────────────┘  │
│                       ↓                             │
│  ┌──────────────────────────────────────────────┐  │
│  │        dmx_scene_macros                      │  │
│  │  scene_id | macro_id                         │  │
│  └──────────────────────────────────────────────┘  │
│                       ↓                             │
│  ┌──────────────────────────────────────────────┐  │
│  │           macros (existing)                  │  │
│  │  id | name | action                          │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘

Scene Save Flow:
  User → Scene Editor → Validate → Serialize to JSON → INSERT/UPDATE → DB

Scene Load Flow:
  User → Scene ID → SELECT → Deserialize JSON → Apply to universe
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────┐
│     dmx_fixtures        │
├─────────────────────────┤
│ • id (TEXT) PK          │
│ • name (TEXT)           │
│ • fixture_type (TEXT)   │
│ • dmx_address (INTEGER) │
│ • universe (INTEGER)    │
│ • channel_definitions   │
│   (TEXT/JSON)           │
└─────────────────────────┘
           ↓ used in
┌─────────────────────────┐
│      dmx_scenes         │
├─────────────────────────┤
│ • id (TEXT) PK          │
│ • name (TEXT)           │
│ • description (TEXT)    │
│ • fade_time_ms (INT)    │
│ • scene_data (TEXT/JSON)│
└─────────────────────────┘
           ↓ linked to
┌─────────────────────────┐       ┌─────────────────────┐
│  dmx_scene_macros       │──────→│    macros           │
├─────────────────────────┤       ├─────────────────────┤
│ • scene_id (TEXT) FK    │       │ • id (INT) PK       │
│ • macro_id (INTEGER) FK │       │ • name (TEXT)       │
│                         │       │ • action (TEXT)     │
│ PRIMARY KEY:            │       └─────────────────────┘
│   (scene_id, macro_id)  │
└─────────────────────────┘
```

### Scene Data JSON Structure

```json
{
  "id": "worship-blue-purple",
  "name": "Worship - Blue Purple",
  "description": "Standard worship lighting with blue/purple tones",
  "fade_time_ms": 3000,
  "fixture_states": [
    {
      "fixture_id": "stage-par-1",
      "channel_values": {
        "red": 128,
        "green": 0,
        "blue": 255,
        "dimmer": 200
      }
    },
    {
      "fixture_id": "house-dimmer",
      "channel_values": {
        "channel_1": 64,
        "channel_2": 64,
        "channel_3": 64,
        "channel_4": 0
      }
    }
  ]
}
```

---

## Hardware Topology

### Simple Church Setup

```
┌─────────────────────────────────────────────────────────────┐
│                     STAGE / WORSHIP AREA                    │
│                                                             │
│     ╔═══╗         ╔═══╗         ╔═══╗         ╔═══╗       │
│     ║ ║ ║         ║ ║ ║         ║ ║ ║         ║ ║ ║       │
│     ║ ▓ ║         ║ ▓ ║         ║ ▓ ║         ║ ▓ ║       │
│     ║ ▓ ║         ║ ▓ ║         ║ ▓ ║         ║ ▓ ║       │
│     ╚═══╝         ╚═══╝         ╚═══╝         ╚═══╝       │
│    Par 1          Par 2         Par 3         Par 4        │
│    Addr:1         Addr:7        Addr:13       Addr:19      │
│      │              │              │              │         │
│      └──────XLR─────┴──────XLR────┴──────XLR────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                               ↑
                          DMX Signal
                               │
┌──────────────────────────────┴──────────────────────────────┐
│                      CONTROL BOOTH                          │
│                                                             │
│   ┌─────────────┐          ┌─────────────────┐            │
│   │   Computer  │──USB────→│  DMX Interface  │            │
│   │ (HarmonySync)│          │  (ENTTEC)       │            │
│   └─────────────┘          └─────────────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Medium Venue Setup

```
┌─────────────────────────────────────────────────────────────┐
│                     STAGE / WORSHIP AREA                    │
│                                                             │
│     ╔═══╗   ╔═══╗   ╔═══╗   ╔═══╗   ╔═══╗   ╔═══╗         │
│     ║▓▓▓║   ║▓▓▓║   ║▓▓▓║   ║▓▓▓║   ║▓▓▓║   ║▓▓▓║ Stage   │
│     ╚═══╝   ╚═══╝   ╚═══╝   ╚═══╝   ╚═══╝   ╚═══╝ Wash    │
│      │       │       │       │       │       │             │
│      └───────┴───────┴───────┴───────┴───────┘             │
│                                                             │
│   ╔═════╗                                   ╔═════╗        │
│   ║▓▓▓▓▓║                                   ║▓▓▓▓▓║        │
│   ║▓▓▓▓▓║  LED Bars                        ║▓▓▓▓▓║        │
│   ╚═════╝  (Uplight)                        ╚═════╝        │
│      │                                         │            │
│      └─────────────────────────────────────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                               ↓ DMX Chain
┌─────────────────────────────────────────────────────────────┐
│                      HOUSE LIGHTING                         │
│                                                             │
│     ┌──────────────┐                                       │
│     │ Dimmer Pack  │  Controls:                            │
│     │              │  • Front House                        │
│     │ [1][2][3][4] │  • Back House                         │
│     │              │  • Side House                         │
│     └──────────────┘  • TV Lights                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### DMX Cable Topology

```
Controller ──XLR──→ Fixture 1 ──XLR──→ Fixture 2 ──XLR──→ ... ──XLR──→ Last Fixture ──→ [Terminator]
                       ↓ DMX IN           ↓ DMX IN                         ↓ DMX IN            (120Ω)
                       ↓ DMX THRU         ↓ DMX THRU                       ↓
```

**Important:**
- **DMX IN**: Receives signal from controller/previous fixture
- **DMX OUT/THRU**: Passes signal to next fixture
- **Terminator**: 120Ω resistor on last fixture (recommended for long runs)

---

## User Interface Mockups

### Main Lighting Control Panel

```
┌───────────────────────────────────────────────────────────────┐
│  Lighting Control                                      ☰ Menu │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Quick Scenes:                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Pre-Service │ │   Worship   │ │   Sermon    │           │
│  │             │ │      ✓      │ │             │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │Post-Service │ │   Blackout  │ │ House Full  │           │
│  │             │ │             │ │             │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                               │
│  ──────────────────────────────────────────────────────────  │
│                                                               │
│  Current Scene: Worship - Blue Purple          ●  Active     │
│  Fade Time: 3.0 seconds                                      │
│  Next Scene: (none)                                          │
│                                                               │
│  ──────────────────────────────────────────────────────────  │
│                                                               │
│  [Edit Scene] [New Scene] [Settings]                         │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Scene Editor

```
┌───────────────────────────────────────────────────────────────┐
│  Edit Scene: Worship - Blue Purple                    [×] Close│
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Scene Name: [Worship - Blue Purple                        ] │
│  Description: [Standard worship with blue/purple tones     ] │
│  Fade Time: [===    ] 3.0 seconds                           │
│                                                               │
│  ──────────────────────────────────────────────────────────  │
│                                                               │
│  Fixtures:                                                    │
│                                                               │
│  ▼ Stage Par 1 (RGB LED - Address 1)                        │
│     Red:    ■■■■■□□□□□  128   [Reset]                       │
│     Green:  □□□□□□□□□□  0     [Reset]                       │
│     Blue:   ■■■■■■■■■■  255   [Reset]                       │
│     Dimmer: ■■■■■■■■□□  200   [Reset]                       │
│                                                               │
│  ▼ Stage Par 2 (RGB LED - Address 7)                        │
│     Red:    ■■■■■□□□□□  128   [Reset]                       │
│     Green:  □□□□□□□□□□  0     [Reset]                       │
│     Blue:   ■■■■■■■■■■  255   [Reset]                       │
│     Dimmer: ■■■■■■■■□□  200   [Reset]                       │
│                                                               │
│  ▼ House Lights (Dimmer - Address 25)                       │
│     Channel 1: ■■□□□□□□□□  64    [Reset]                    │
│     Channel 2: ■■□□□□□□□□  64    [Reset]                    │
│     Channel 3: ■■□□□□□□□□  64    [Reset]                    │
│     Channel 4: □□□□□□□□□□  0     [Reset]                    │
│                                                               │
│  ──────────────────────────────────────────────────────────  │
│                                                               │
│  [Test Scene] [Copy Values From...] [Save] [Cancel]         │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Fixture Configuration

```
┌───────────────────────────────────────────────────────────────┐
│  DMX Fixtures                                          [+] Add │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Stage Par 1                                    [✎] [🗑] │ │
│  │ Type: RGB LED Par (6 channel)                           │ │
│  │ Address: 1   Universe: 1   Channels: 1-6               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Stage Par 2                                    [✎] [🗑] │ │
│  │ Type: RGB LED Par (6 channel)                           │ │
│  │ Address: 7   Universe: 1   Channels: 7-12              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ House Lights                                   [✎] [🗑] │ │
│  │ Type: Dimmer Pack (4 channel)                           │ │
│  │ Address: 25  Universe: 1   Channels: 25-28             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ TV Lights                                      [✎] [🗑] │ │
│  │ Type: Dimmer Pack (2 channel)                           │ │
│  │ Address: 29  Universe: 1   Channels: 29-30             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Total DMX Channels Used: 30 / 512                           │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Add Fixture Dialog

```
┌───────────────────────────────────────────────────────────────┐
│  Add Fixture                                          [×] Close │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Fixture Type:                                                │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ RGB LED Par (6 channel)                            ▼ │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  Fixture Name:                                                │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Stage Par 1                                           │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  DMX Address:                                                 │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 1                                                     │   │
│  └───────────────────────────────────────────────────────┘   │
│  (Uses channels 1-6)                                          │
│                                                               │
│  Universe:                                                    │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ 1                                                  ▼ │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  Channel Preview:                                             │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ CH1 (DMX 1):  Red                                     │   │
│  │ CH2 (DMX 2):  Green                                   │   │
│  │ CH3 (DMX 3):  Blue                                    │   │
│  │ CH4 (DMX 4):  Dimmer                                  │   │
│  │ CH5 (DMX 5):  Strobe                                  │   │
│  │ CH6 (DMX 6):  Mode                                    │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  [Add Fixture] [Cancel]                                      │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Scene State Machine

### Scene Lifecycle

```
┌─────────────┐
│   Created   │ (New scene saved to database)
└──────┬──────┘
       ↓
┌──────────────┐
│    Idle      │ (Scene exists but not active)
└──────┬───────┘
       │
       ├──→ Recall Scene
       │
       ↓
┌──────────────┐
│   Loading    │ (Retrieving from database)
└──────┬───────┘
       ↓
┌──────────────┐
│ Transitioning│ (Fading to new values)
└──────┬───────┘
       │
       ├──→ If fade_time = 0
       │    Jump directly to Active
       │
       ├──→ If fade_time > 0
       │    Interpolate over time
       │
       ↓
┌──────────────┐
│    Active    │ (Scene fully applied)
└──────┬───────┘
       │
       ├──→ Another scene recalled → Back to Idle
       ├──→ Manual adjustment → Enter Manual Override
       └──→ Delete scene → Deleted
```

### Transition State Details

```
Start Transition:
  current_values = universe.channels.clone()
  target_values = scene_to_universe(scene)
  progress = 0.0

Loop (every 22ms @ 45 Hz):
  progress += delta_time / fade_duration
  
  if progress >= 1.0:
    universe.channels = target_values
    state = Active
    break
  
  for channel in 0..512:
    interpolated = lerp(
      current_values[channel],
      target_values[channel],
      progress
    )
    universe.channels[channel] = interpolated
  
  send_dmx(universe)
```

---

## Memory Layout

### DMX Engine Memory Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    DMX Engine (~20 MB)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Universes (4 × 512 bytes)                    = 2 KB       │
│  ┌──────────────────────────────────────────┐              │
│  │ Universe 1: [u8; 512]                    │              │
│  │ Universe 2: [u8; 512]                    │              │
│  │ Universe 3: [u8; 512]                    │              │
│  │ Universe 4: [u8; 512]                    │              │
│  └──────────────────────────────────────────┘              │
│                                                             │
│  Transition Buffers (2 × 512 bytes)           = 1 KB       │
│  ┌──────────────────────────────────────────┐              │
│  │ Current Values: [u8; 512]                │              │
│  │ Target Values: [u8; 512]                 │              │
│  └──────────────────────────────────────────┘              │
│                                                             │
│  Scene Cache (100 scenes × ~5 KB)            = 500 KB      │
│  Fixture Definitions (50 × ~2 KB)            = 100 KB      │
│  Driver State                                = 5-10 MB     │
│  Rust Async Runtime                          = 5-10 MB     │
│                                                             │
│  Total:                                      ≈ 10-25 MB    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Universe Buffer Layout

```
DMX Universe (512 bytes):

Offset  Value  Fixture            Channel
------  -----  -----------------  --------
0       0      (unused)           -
1       128    Stage Par 1        Red
2       0      Stage Par 1        Green
3       255    Stage Par 1        Blue
4       200    Stage Par 1        Dimmer
5       0      Stage Par 1        Strobe
6       0      Stage Par 1        Mode
7       128    Stage Par 2        Red
8       0      Stage Par 2        Green
...     ...    ...                ...
25      64     House Dimmer       CH1
26      64     House Dimmer       CH2
27      64     House Dimmer       CH3
28      0      House Dimmer       CH4
...     ...    ...                ...
511     0      (unused)           -
```

---

## Timing Diagrams

### DMX Output Timing

```
Time:  0ms          22ms        44ms        66ms        88ms
       │           │           │           │           │
Frame: ├───────────┼───────────┼───────────┼───────────┼─→
       │           │           │           │           │
       │  Compute  │  Compute  │  Compute  │  Compute  │
       │  Universe │  Universe │  Universe │  Universe │
       │     ↓     │     ↓     │     ↓     │     ↓     │
       │  Send DMX │  Send DMX │  Send DMX │  Send DMX │
       │           │           │           │           │
       
DMX Refresh Rate: 45 Hz (every 22ms)
```

### Transition Timeline Example

```
Fade from Scene A to Scene B (3000ms fade time):

Time:    0ms      500ms    1000ms   1500ms   2000ms   2500ms   3000ms
         │         │         │        │        │        │        │
Scene A: [████████████████████████████████                       ] 100% → 0%
Scene B: [                                ████████████████████████] 0%   → 100%
         │         │         │        │        │        │        │
Progress: 0%       16.7%     33.3%    50%      66.7%    83.3%    100%

Channel Value Interpolation (example: Red channel):
  Start: 255 (Scene A)
  End:   128 (Scene B)
  
  t=0ms:    255
  t=500ms:  234
  t=1000ms: 213
  t=1500ms: 191
  t=2000ms: 170
  t=2500ms: 149
  t=3000ms: 128 ✓
```

### ENTTEC USB Pro Protocol Timing

```
Packet Structure:
┌────┬──────┬────────┬────────┬──────────────┬────┐
│Start│Label │Length  │Length  │ Data (512)   │End │
│0x7E │0x06  │LSB     │MSB     │ bytes        │0xE7│
└────┴──────┴────────┴────────┴──────────────┴────┘
  1B    1B     1B       1B        512B         1B
                                            
Total Packet Size: 518 bytes

Send Time (57600 baud): ~72ms per packet
Actual DMX Update Rate: ~14 Hz (limited by USB protocol)

Note: Internal interpolation runs at 45 Hz, USB output at 14 Hz
```

---

## Conclusion

These visual diagrams provide a comprehensive view of:
- System architecture and component relationships
- Data flow through the DMX system
- Database structure and relationships
- Hardware topology and connection patterns
- User interface designs and workflows
- Memory layout and resource usage
- Timing and performance characteristics

**Use these diagrams as reference during implementation to ensure consistency and correctness.**

---

**Document Version:** 1.0  
**Date:** 2025-10-24  
**Status:** Research Complete
