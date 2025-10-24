// MIDI Manager - Handles MIDI device enumeration and routing
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
    // Placeholder for MIDI connections
    // In full implementation, would use midir crate
}

impl MidiManager {
    pub fn new() -> Result<Self> {
        Ok(Self {})
    }

    /// Get all available MIDI input devices
    pub fn get_input_devices(&self) -> Result<Vec<MidiDevice>> {
        // For prototype, return mock devices
        // In full implementation, would use midir to enumerate actual devices
        Ok(vec![
            MidiDevice {
                id: "midi_in_0".to_string(),
                name: "MIDI Keyboard".to_string(),
                manufacturer: "Generic".to_string(),
                is_input: true,
                port_index: 0,
            },
            MidiDevice {
                id: "midi_in_1".to_string(),
                name: "Electric Drum Kit".to_string(),
                manufacturer: "Generic".to_string(),
                is_input: true,
                port_index: 1,
            },
        ])
    }

    /// Get all available MIDI output devices
    pub fn get_output_devices(&self) -> Result<Vec<MidiDevice>> {
        // For prototype, return mock devices
        Ok(vec![
            MidiDevice {
                id: "midi_out_0".to_string(),
                name: "MIDI Output".to_string(),
                manufacturer: "Generic".to_string(),
                is_input: false,
                port_index: 0,
            },
        ])
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
use std::sync::Arc;
use tokio::sync::Mutex;

static MIDI_MANAGER: Lazy<Arc<Mutex<Option<MidiManager>>>> =
    Lazy::new(|| Arc::new(Mutex::new(None)));

pub async fn get_midi_manager() -> Arc<Mutex<Option<MidiManager>>> {
    MIDI_MANAGER.clone()
}

pub async fn initialize_midi_manager() -> Result<()> {
    let manager = MidiManager::new()?;
    let mut global = MIDI_MANAGER.lock().await;
    *global = Some(manager);
    Ok(())
}
