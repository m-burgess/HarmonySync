// src/infrastructure/midi.rs
use crate::core::use_cases::midi_use_case::{MidiMapping, MidiFunction};
use midir::{MidiInput, MidiInputConnection, MidiOutput, MidiOutputConnection};
use std::error::Error;
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;

#[derive(Debug, Clone, PartialEq)]
pub enum MidiMessage {
    NoteOn { channel: u8, note: u8, velocity: u8 },
    NoteOff { channel: u8, note: u8, velocity: u8 },
    ControlChange { channel: u8, controller: u8, value: u8 },
    ProgramChange { channel: u8, program: u8 },
    PitchBend { channel: u8, value: u16 },
    SysEx(Vec<u8>),
    Clock,
    Start,
    Stop,
    Continue,
    Unknown(Vec<u8>),
}

#[derive(Debug, Clone, PartialEq)]
pub enum MidiCommand {
    NextSlide,
    PreviousSlide,
    PlaySong,
    StopSong,
    VolumeChange { track: u8, volume: f32 },
    PanChange { track: u8, pan: i8 }, // -127 to +127
    MuteToggle { track: u8 },
    SoloToggle { track: u8 },
    TransposeChange { semitones: i8 },
    SetTempo { bpm: u8 },
    TriggerCue { cue_number: u8 },
}

pub struct MidiService {
    input_connections: Arc<Mutex<Vec<MidiInputConnection<()>>>>,
    output_connections: Arc<Mutex<Vec<MidiOutputConnection>>>,
    command_sender: Sender<MidiCommand>,
    command_receiver: Arc<Mutex<Receiver<MidiCommand>>>,
    midi_sender: Sender<MidiMessage>,
    midi_receiver: Arc<Mutex<Receiver<MidiMessage>>>,
}

impl MidiService {
    pub fn new() -> Result<Self, Box<dyn Error>> {
        let (command_sender, command_receiver) = mpsc::channel();
        let (midi_sender, midi_receiver) = mpsc::channel();

        Ok(Self {
            input_connections: Arc::new(Mutex::new(Vec::new())),
            output_connections: Arc::new(Mutex::new(Vec::new())),
            command_sender,
            command_receiver: Arc::new(Mutex::new(command_receiver)),
            midi_sender,
            midi_receiver: Arc::new(Mutex::new(midi_receiver)),
        })
    }

    /// Get available MIDI input ports
    pub fn get_input_ports(&self) -> Result<Vec<String>, Box<dyn Error>> {
        let midi_in = MidiInput::new("Slint Presenter Input Scanner")?;
        let ports = midi_in.ports();
        let port_names: Result<Vec<String>, _> = ports
            .iter()
            .map(|port| midi_in.port_name(port))
            .collect();
        Ok(port_names?)
    }

    /// Get available MIDI output ports  
    pub fn get_output_ports(&self) -> Result<Vec<String>, Box<dyn Error>> {
        let midi_out = MidiOutput::new("Slint Presenter Output Scanner")?;
        let ports = midi_out.ports();
        let port_names: Result<Vec<String>, _> = ports
            .iter()
            .map(|port| midi_out.port_name(port))
            .collect();
        Ok(port_names?)
    }

    /// Connect to a MIDI input device
    pub fn connect_input(&mut self, port_name: &str, midi_mapping: Arc<Mutex<crate::core::use_cases::midi_use_case::MidiMapping>>) -> Result<(), Box<dyn Error>> {
        let midi_in = MidiInput::new("Slint Presenter Input")?;
        let ports = midi_in.ports();
        
        let port = ports
            .iter()
            .find(|port| midi_in.port_name(port).unwrap_or_default() == port_name)
            .ok_or(format!("MIDI input port '{}' not found", port_name))?;

        let midi_sender = self.midi_sender.clone();
        let command_sender = self.command_sender.clone();

        let connection = midi_in.connect(
            port,
            "slint-presenter-input",
            move |_timestamp, message, _| {
                if let Ok(parsed_message) = Self::parse_midi_message(message) {
                    // Send raw MIDI message
                    let _ = midi_sender.send(parsed_message.clone());
                    
                    // Convert to command if applicable using the provided mapping
                    if let Some(command) = Self::midi_message_to_command(&parsed_message, &midi_mapping.lock().unwrap()) {
                        let _ = command_sender.send(command);
                    }
                }
            },
            (),
        )?;

        self.input_connections.lock().unwrap().push(connection);
        Ok(())
    }

    /// Connect to a MIDI output device
    pub fn connect_output(&mut self, port_name: &str) -> Result<(), Box<dyn Error>> {
        let midi_out = MidiOutput::new("Slint Presenter Output")?;
        let ports = midi_out.ports();
        
        let port = ports
            .iter()
            .find(|port| midi_out.port_name(port).unwrap_or_default() == port_name)
            .ok_or(format!("MIDI output port '{}' not found", port_name))?;

        let connection = midi_out.connect(port, "slint-presenter-output")?;
        self.output_connections.lock().unwrap().push(connection);
        Ok(())
    }

    /// Send a MIDI message to all connected outputs
    pub fn send_midi_message(&self, message: &MidiMessage) -> Result<(), Box<dyn Error>> {
        let midi_data = Self::message_to_bytes(message);
        let mut connections = self.output_connections.lock().unwrap();
        
        for connection in connections.iter_mut() {
            connection.send(&midi_data)?;
        }
        Ok(())
    }

    /// Get the command receiver for processing MIDI commands
    pub fn get_command_receiver(&self) -> Arc<Mutex<Receiver<MidiCommand>>> {
        self.command_receiver.clone()
    }

    /// Get the MIDI message receiver for raw MIDI data
    pub fn get_midi_receiver(&self) -> Arc<Mutex<Receiver<MidiMessage>>> {
        self.midi_receiver.clone()
    }

    /// Send a MIDI clock message (for sync)
    pub fn send_clock(&self) -> Result<(), Box<dyn Error>> {
        self.send_midi_message(&MidiMessage::Clock)
    }

    /// Send MIDI start message
    pub fn send_start(&self) -> Result<(), Box<dyn Error>> {
        self.send_midi_message(&MidiMessage::Start)
    }

    /// Send MIDI stop message
    pub fn send_stop(&self) -> Result<(), Box<dyn Error>> {
        self.send_midi_message(&MidiMessage::Stop)
    }

    /// Send lighting cue via MIDI (using MSC - MIDI Show Control)
    pub fn send_lighting_cue(&self, cue_number: u8) -> Result<(), Box<dyn Error>> {
        // MSC (MIDI Show Control) format for lighting cues
        let msc_message = vec![
            0xF0, // SysEx start
            0x7F, // Universal Real Time SysEx
            0x00, // Device ID (all devices)
            0x02, // MSC (MIDI Show Control)
            0x01, // Lighting command format
            0x01, // GO command
            cue_number, // Cue number
            0xF7, // SysEx end
        ];
        self.send_midi_message(&MidiMessage::SysEx(msc_message))
    }

    /// Send program change for external instruments
    pub fn send_program_change(&self, channel: u8, program: u8) -> Result<(), Box<dyn Error>> {
        self.send_midi_message(&MidiMessage::ProgramChange { channel, program })
    }

    /// Parse raw MIDI bytes into structured message
    fn parse_midi_message(data: &[u8]) -> Result<MidiMessage, Box<dyn Error>> {
        if data.is_empty() {
            return Err("Empty MIDI message".into());
        }

        let status = data[0];

        match status {
            // System Real-Time messages
            0xF8 => Ok(MidiMessage::Clock),
            0xFA => Ok(MidiMessage::Start),
            0xFB => Ok(MidiMessage::Continue),
            0xFC => Ok(MidiMessage::Stop),
            
            // System Exclusive
            0xF0 => Ok(MidiMessage::SysEx(data.to_vec())),
            
            // Channel messages
            _ => {
                let channel = status & 0x0F;
                let message_type = status & 0xF0;

                match message_type {
                    0x80 => { // Note Off
                        if data.len() >= 3 {
                            Ok(MidiMessage::NoteOff {
                                channel,
                                note: data[1],
                                velocity: data[2],
                            })
                        } else {
                            Err("Incomplete Note Off message".into())
                        }
                    }
                    0x90 => { // Note On
                        if data.len() >= 3 {
                            if data[2] == 0 {
                                // Velocity 0 is Note Off
                                Ok(MidiMessage::NoteOff {
                                    channel,
                                    note: data[1],
                                    velocity: data[2],
                                })
                            } else {
                                Ok(MidiMessage::NoteOn {
                                    channel,
                                    note: data[1],
                                    velocity: data[2],
                                })
                            }
                        } else {
                            Err("Incomplete Note On message".into())
                        }
                    }
                    0xB0 => { // Control Change
                        if data.len() >= 3 {
                            Ok(MidiMessage::ControlChange {
                                channel,
                                controller: data[1],
                                value: data[2],
                            })
                        } else {
                            Err("Incomplete Control Change message".into())
                        }
                    }
                    0xC0 => { // Program Change
                        if data.len() >= 2 {
                            Ok(MidiMessage::ProgramChange {
                                channel,
                                program: data[1],
                            })
                        } else {
                            Err("Incomplete Program Change message".into())
                        }
                    }
                    0xE0 => { // Pitch Bend
                        if data.len() >= 3 {
                            let value = ((data[2] as u16) << 7) | (data[1] as u16);
                            Ok(MidiMessage::PitchBend { channel, value })
                        } else {
                            Err("Incomplete Pitch Bend message".into())
                        }
                    }
                    _ => Ok(MidiMessage::Unknown(data.to_vec())),
                }
            }
        }
    }

    /// Convert MIDI message to application command using a dynamic mapping
    fn midi_message_to_command(message: &MidiMessage, mapping: &crate::core::use_cases::midi_use_case::MidiMapping) -> Option<MidiCommand> {
        if !mapping.enabled { return None; }

        match message {
            MidiMessage::NoteOn { channel, note, velocity: _ } => {
                if let Some(filter_channel) = mapping.channel_filter {
                    if *channel != filter_channel { return None; }
                }
                mapping.note_mappings.get(note).cloned()
            }
            MidiMessage::ControlChange { channel, controller, value } => {
                if let Some(filter_channel) = mapping.channel_filter {
                    if *channel != filter_channel { return None; }
                }
                mapping.cc_mappings.get(controller).and_then(|function| {
                    match function {
                        crate::core::use_cases::midi_use_case::MidiFunction::VolumeControl { track } => {
                            Some(MidiCommand::VolumeChange { track: *track, volume: *value as f32 / 127.0 })
                        }
                        crate::core::use_cases::midi_use_case::MidiFunction::PanControl { track } => {
                            Some(MidiCommand::PanChange { track: *track, pan: (*value as i8) - 64 })
                        }
                        crate::core::use_cases::midi_use_case::MidiFunction::TransposeControl => {
                            Some(MidiCommand::TransposeChange { semitones: (*value as i8) - 64 })
                        }
                        crate::core::use_cases::midi_use_case::MidiFunction::MasterVolume => {
                            Some(MidiCommand::VolumeChange { track: 255, volume: *value as f32 / 127.0 })
                        }
                        crate::core::use_cases::midi_use_case::MidiFunction::TempoControl => {
                            Some(MidiCommand::SetTempo { bpm: *value })
                        }
                    }
                })
            }
            MidiMessage::ProgramChange { channel, program } => {
                if let Some(filter_channel) = mapping.channel_filter {
                    if *channel != filter_channel { return None; }
                }
                Some(MidiCommand::TriggerCue { cue_number: *program })
            }
            _ => None,
        }
    }

    /// Convert MidiMessage to raw bytes for sending
    fn message_to_bytes(message: &MidiMessage) -> Vec<u8> {
        match message {
            MidiMessage::NoteOn { channel, note, velocity } => {
                vec![0x90 | channel, *note, *velocity]
            }
            MidiMessage::NoteOff { channel, note, velocity } => {
                vec![0x80 | channel, *note, *velocity]
            }
            MidiMessage::ControlChange { channel, controller, value } => {
                vec![0xB0 | channel, *controller, *value]
            }
            MidiMessage::ProgramChange { channel, program } => {
                vec![0xC0 | channel, *program]
            }
            MidiMessage::PitchBend { channel, value } => {
                vec![0xE0 | channel, (value & 0x7F) as u8, ((value >> 7) & 0x7F) as u8]
            }
            MidiMessage::SysEx(data) => data.clone(),
            MidiMessage::Clock => vec![0xF8],
            MidiMessage::Start => vec![0xFA],
            MidiMessage::Stop => vec![0xFC],
            MidiMessage::Continue => vec![0xFB],
            MidiMessage::Unknown(data) => data.clone(),
        }
    }

    /// Create a MIDI clock thread for sync
    pub fn start_clock_thread(&self, bpm: u32) -> ClockHandle {
        let connections = self.output_connections.clone();
        let running = Arc::new(std::sync::atomic::AtomicBool::new(true));
        let running_clone = running.clone();

        let handle = thread::spawn(move || {
            let interval_ms = 60_000 / (bpm * 24); // MIDI clock is 24 PPQ
            
            while running_clone.load(std::sync::atomic::Ordering::SeqCst) {
                let clock_data = vec![0xF8]; // MIDI Clock byte
                
                if let Ok(mut connections_guard) = connections.lock() {
                    for connection in connections_guard.iter_mut() {
                        let _ = connection.send(&clock_data);
                    }
                }
                
                thread::sleep(std::time::Duration::from_millis(interval_ms as u64));
            }
        });

        ClockHandle { handle: Some(handle), running }
    }
}

/// Handle for controlling MIDI clock thread
pub struct ClockHandle {
    handle: Option<thread::JoinHandle<()>>,
    running: Arc<std::sync::atomic::AtomicBool>,
}

impl ClockHandle {
    pub fn stop(mut self) {
        self.running.store(false, std::sync::atomic::Ordering::SeqCst);
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

impl Drop for ClockHandle {
    fn drop(&mut self) {
        self.running.store(false, std::sync::atomic::Ordering::SeqCst);
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_midi_message_parsing_note_on() {
        let data = [0x90, 60, 100]; // Note On, Channel 0, C4, Velocity 100
        let message = MidiService::parse_midi_message(&data).unwrap();
        
        match message {
            MidiMessage::NoteOn { channel, note, velocity } => {
                assert_eq!(channel, 0);
                assert_eq!(note, 60);
                assert_eq!(velocity, 100);
            }
            _ => panic!("Expected NoteOn message"),
        }
    }

    #[test]
    fn test_midi_message_parsing_note_off() {
        let data = [0x80, 60, 0]; // Note Off, Channel 0, C4
        let message = MidiService::parse_midi_message(&data).unwrap();
        
        match message {
            MidiMessage::NoteOff { channel, note, velocity } => {
                assert_eq!(channel, 0);
                assert_eq!(note, 60);
                assert_eq!(velocity, 0);
            }
            _ => panic!("Expected NoteOff message"),
        }
    }

    #[test]
    fn test_midi_message_parsing_control_change() {
        let data = [0xB0, 7, 100]; // CC, Channel 0, Volume, Value 100
        let message = MidiService::parse_midi_message(&data).unwrap();
        
        match message {
            MidiMessage::ControlChange { channel, controller, value } => {
                assert_eq!(channel, 0);
                assert_eq!(controller, 7);
                assert_eq!(value, 100);
            }
            _ => panic!("Expected ControlChange message"),
        }
    }

    #[test]
    fn test_midi_message_parsing_clock() {
        let data = [0xF8];
        let message = MidiService::parse_midi_message(&data).unwrap();
        assert_eq!(message, MidiMessage::Clock);
    }

    #[test]
    fn test_midi_message_to_command_next_slide() {
        let message = MidiMessage::NoteOn { channel: 0, note: 60, velocity: 100 };
        let mapping = crate::core::use_cases::midi_use_case::MidiMapping {
            note_mappings: std::collections::HashMap::from([(60, MidiCommand::NextSlide)]),
            cc_mappings: std::collections::HashMap::new(),
            channel_filter: Some(0),
            enabled: true,
        };
        let command = MidiService::midi_message_to_command(&message, &mapping);
        assert_eq!(command, Some(MidiCommand::NextSlide));
    }

    #[test]
    fn test_midi_message_to_command_volume_change() {
        let message = MidiMessage::ControlChange { channel: 0, controller: 1, value: 64 };
        let mapping = crate::core::use_cases::midi_use_case::MidiMapping {
            note_mappings: std::collections::HashMap::new(),
            cc_mappings: std::collections::HashMap::from([(1, crate::core::use_cases::midi_use_case::MidiFunction::VolumeControl { track: 0 })]),
            channel_filter: Some(0),
            enabled: true,
        };
        let command = MidiService::midi_message_to_command(&message, &mapping);
        match command {
            Some(MidiCommand::VolumeChange { track, volume }) => {
                assert_eq!(track, 0);
                assert!((volume - 0.503937).abs() < 0.01); // 64/127 ≈ 0.504
            }
            _ => panic!("Expected VolumeChange command"),
        }
    }

    #[test]
    fn test_message_to_bytes_note_on() {
        let message = MidiMessage::NoteOn { channel: 0, note: 60, velocity: 100 };
        let bytes = MidiService::message_to_bytes(&message);
        assert_eq!(bytes, vec![0x90, 60, 100]);
    }

    #[test]
    fn test_message_to_bytes_control_change() {
        let message = MidiMessage::ControlChange { channel: 5, controller: 7, value: 127 };
        let bytes = MidiService::message_to_bytes(&message);
        assert_eq!(bytes, vec![0xB5, 7, 127]);
    }

    #[test]
    fn test_message_to_bytes_clock() {
        let message = MidiMessage::Clock;
        let bytes = MidiService::message_to_bytes(&message);
        assert_eq!(bytes, vec![0xF8]);
    }

    #[test]
    fn test_midi_service_creation() {
        let service = MidiService::new();
        assert!(service.is_ok());
    }

    #[test]
    fn test_empty_midi_message() {
        let result = MidiService::parse_midi_message(&[]);
        assert!(result.is_err());
    }

    #[test]
    fn test_incomplete_note_on_message() {
        let data = [0x90, 60]; // Missing velocity
        let result = MidiService::parse_midi_message(&data);
        assert!(result.is_err());
    }

    #[test]
    fn test_pitch_bend_parsing() {
        let data = [0xE0, 0x00, 0x40]; // Pitch bend, Channel 0, center value
        let message = MidiService::parse_midi_message(&data).unwrap();
        
        match message {
            MidiMessage::PitchBend { channel, value } => {
                assert_eq!(channel, 0);
                assert_eq!(value, 0x2000); // 0x40 << 7 | 0x00 = 0x2000
            }
            _ => panic!("Expected PitchBend message"),
        }
    }

    #[test]
    fn test_program_change_parsing() {
        let data = [0xC0, 42]; // Program change, Channel 0, Program 42
        let message = MidiService::parse_midi_message(&data).unwrap();
        
        match message {
            MidiMessage::ProgramChange { channel, program } => {
                assert_eq!(channel, 0);
                assert_eq!(program, 42);
            }
            _ => panic!("Expected ProgramChange message"),
        }
    }

    #[test]
    fn test_midi_commands_equality() {
        let cmd1 = MidiCommand::NextSlide;
        let cmd2 = MidiCommand::NextSlide;
        let cmd3 = MidiCommand::PreviousSlide;
        
        assert_eq!(cmd1, cmd2);
        assert_ne!(cmd1, cmd3);
    }

    #[test]
    fn test_sysex_message() {
        let sysex_data = vec![0xF0, 0x7F, 0x00, 0x02, 0x01, 0x01, 42, 0xF7];
        let message = MidiService::parse_midi_message(&sysex_data).unwrap();
        
        match message {
            MidiMessage::SysEx(data) => {
                assert_eq!(data, sysex_data);
            }
            _ => panic!("Expected SysEx message"),
        }
    }
}
