// src/application/midi_use_case.rs
use crate::data::repositories::midi::{MidiService, MidiCommand, MidiMessage, ClockHandle};
use std::sync::{Arc, Mutex};
use std::sync::mpsc::Receiver;
use std::error::Error;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct MidiMapping {
    pub note_mappings: HashMap<u8, MidiCommand>, // MIDI note to command
    pub cc_mappings: HashMap<u8, MidiFunction>,  // CC number to function
    pub channel_filter: Option<u8>,              // Only listen to specific channel
    pub enabled: bool,
}

#[derive(Debug, Clone)]
pub enum MidiFunction {
    VolumeControl { track: u8 },
    PanControl { track: u8 },
    TransposeControl,
    MasterVolume,
    TempoControl,
}

pub struct MidiUseCase {
    midi_service: Arc<Mutex<MidiService>>,
    current_mapping: Arc<Mutex<MidiMapping>>,
    clock_handle: Arc<Mutex<Option<ClockHandle>>>,
}

impl MidiUseCase {
    pub fn new() -> Result<Self, Box<dyn Error>> {
        let midi_service = Arc::new(Mutex::new(MidiService::new()?));
        
        // Default MIDI mapping
        let mut note_mappings = HashMap::new();
        note_mappings.insert(60, MidiCommand::NextSlide);      // C4
        note_mappings.insert(59, MidiCommand::PreviousSlide);  // B3
        note_mappings.insert(58, MidiCommand::PlaySong);       // A#3
        note_mappings.insert(57, MidiCommand::StopSong);       // A3
        note_mappings.insert(56, MidiCommand::MuteToggle { track: 0 }); // G#3
        note_mappings.insert(55, MidiCommand::SoloToggle { track: 0 }); // G3

        let mut cc_mappings = HashMap::new();
        cc_mappings.insert(1, MidiFunction::VolumeControl { track: 0 });
        cc_mappings.insert(2, MidiFunction::VolumeControl { track: 1 });
        cc_mappings.insert(3, MidiFunction::VolumeControl { track: 2 });
        cc_mappings.insert(4, MidiFunction::VolumeControl { track: 3 });
        cc_mappings.insert(7, MidiFunction::MasterVolume);
        cc_mappings.insert(10, MidiFunction::PanControl { track: 0 });
        cc_mappings.insert(11, MidiFunction::PanControl { track: 1 });
        cc_mappings.insert(12, MidiFunction::PanControl { track: 2 });
        cc_mappings.insert(13, MidiFunction::PanControl { track: 3 });
        cc_mappings.insert(16, MidiFunction::TransposeControl);
        cc_mappings.insert(20, MidiFunction::TempoControl);

        let mapping = MidiMapping {
            note_mappings,
            cc_mappings,
            channel_filter: Some(0), // Listen only to channel 1 (0-based)
            enabled: true,
        };

        Ok(Self {
            midi_service,
            current_mapping: Arc::new(Mutex::new(mapping)),
            clock_handle: Arc::new(Mutex::new(None)),
        })
    }

    /// Get available MIDI input devices
    pub fn get_available_input_devices(&self) -> Result<Vec<String>, Box<dyn Error>> {
        self.midi_service.lock().unwrap().get_input_ports()
    }

    /// Get available MIDI output devices
    pub fn get_available_output_devices(&self) -> Result<Vec<String>, Box<dyn Error>> {
        self.midi_service.lock().unwrap().get_output_ports()
    }

    /// Connect to a MIDI input device
    pub fn connect_input_device(&self, device_name: &str) -> Result<(), Box<dyn Error>> {
        let mapping_clone = self.current_mapping.clone();
        self.midi_service.lock().unwrap().connect_input(device_name, mapping_clone)
    }

    /// Connect to a MIDI output device
    pub fn connect_output_device(&self, device_name: &str) -> Result<(), Box<dyn Error>> {
        self.midi_service.lock().unwrap().connect_output(device_name)
    }

    /// Get command receiver for processing MIDI commands
    pub fn get_command_receiver(&self) -> Arc<Mutex<Receiver<MidiCommand>>> {
        self.midi_service.lock().unwrap().get_command_receiver()
    }

    /// Get raw MIDI message receiver
    pub fn get_midi_receiver(&self) -> Arc<Mutex<Receiver<MidiMessage>>> {
        self.midi_service.lock().unwrap().get_midi_receiver()
    }

    /// Send lighting cue via MIDI Show Control
    pub fn send_lighting_cue(&self, cue_number: u8) -> Result<(), Box<dyn Error>> {
        self.midi_service.lock().unwrap().send_lighting_cue(cue_number)
    }

    /// Send program change for external instruments/devices
    pub fn send_program_change(&self, channel: u8, program: u8) -> Result<(), Box<dyn Error>> {
        self.midi_service.lock().unwrap().send_program_change(channel, program)
    }

    /// Start MIDI clock for synchronization
    pub fn start_midi_clock(&self, bpm: u32) -> Result<(), Box<dyn Error>> {
        let mut clock_guard = self.clock_handle.lock().unwrap();
        
        // Stop existing clock if running
        if let Some(handle) = clock_guard.take() {
            handle.stop();
        }

        // Start new clock
        let service = self.midi_service.lock().unwrap();
        let new_handle = service.start_clock_thread(bpm);
        *clock_guard = Some(new_handle);

        // Send MIDI start message
        service.send_start()?;
        
        Ok(())
    }

    /// Stop MIDI clock
    pub fn stop_midi_clock(&self) -> Result<(), Box<dyn Error>> {
        let mut clock_guard = self.clock_handle.lock().unwrap();
        
        if let Some(handle) = clock_guard.take() {
            handle.stop();
        }

        // Send MIDI stop message
        self.midi_service.lock().unwrap().send_stop()?;
        
        Ok(())
    }

    /// Update MIDI mapping configuration
    pub fn update_mapping(&self, mapping: MidiMapping) {
        *self.current_mapping.lock().unwrap() = mapping;
    }

    /// Get current MIDI mapping
    pub fn get_mapping(&self) -> MidiMapping {
        self.current_mapping.lock().unwrap().clone()
    }

    /// Enable/disable MIDI input processing
    pub fn set_midi_enabled(&self, enabled: bool) {
        self.current_mapping.lock().unwrap().enabled = enabled;
    }

    /// Set MIDI channel filter (None = all channels)
    pub fn set_channel_filter(&self, channel: Option<u8>) {
        self.current_mapping.lock().unwrap().channel_filter = channel;
    }

    /// Add note mapping
    pub fn add_note_mapping(&self, note: u8, command: MidiCommand) {
        self.current_mapping.lock().unwrap()
            .note_mappings.insert(note, command);
    }

    /// Remove note mapping
    pub fn remove_note_mapping(&self, note: u8) {
        self.current_mapping.lock().unwrap()
            .note_mappings.remove(&note);
    }

    /// Add CC mapping
    pub fn add_cc_mapping(&self, cc: u8, function: MidiFunction) {
        self.current_mapping.lock().unwrap()
            .cc_mappings.insert(cc, function);
    }

    /// Remove CC mapping
    pub fn remove_cc_mapping(&self, cc: u8) {
        self.current_mapping.lock().unwrap()
            .cc_mappings.remove(&cc);
    }

    /// Send MIDI feedback (e.g., to light up buttons on controller)
    pub fn send_feedback(&self, command: &MidiCommand, active: bool) -> Result<(), Box<dyn Error>> {
        let velocity = if active { 127 } else { 0 };
        
        // Map command back to MIDI note for feedback
        let note = match command {
            MidiCommand::NextSlide => 60,
            MidiCommand::PreviousSlide => 59,
            MidiCommand::PlaySong => 58,
            MidiCommand::StopSong => 57,
            MidiCommand::MuteToggle { track: 0 } => 56,
            MidiCommand::SoloToggle { track: 0 } => 55,
            _ => return Ok(()), // No feedback for other commands
        };

        let message = MidiMessage::NoteOn {
            channel: 0,
            note,
            velocity,
        };

        self.midi_service.lock().unwrap().send_midi_message(&message)
    }

    /// Send track volume feedback via CC
    pub fn send_volume_feedback(&self, track: u8, volume: f32) -> Result<(), Box<dyn Error>> {
        let cc_number = match track {
            0 => 1,
            1 => 2,
            2 => 3,
            3 => 4,
            255 => 7, // Master volume
            _ => return Ok(()),
        };

        let message = MidiMessage::ControlChange {
            channel: 0,
            controller: cc_number,
            value: (volume * 127.0) as u8,
        };

        self.midi_service.lock().unwrap().send_midi_message(&message)
    }

    /// Send pan position feedback
    pub fn send_pan_feedback(&self, track: u8, pan: i8) -> Result<(), Box<dyn Error>> {
        let cc_number = match track {
            0 => 10,
            1 => 11,
            2 => 12,
            3 => 13,
            _ => return Ok(()),
        };

        let message = MidiMessage::ControlChange {
            channel: 0,
            controller: cc_number,
            value: (pan + 64) as u8, // Convert -64..+63 to 0..127
        };

        self.midi_service.lock().unwrap().send_midi_message(&message)
    }

    /// Load MIDI mapping from JSON file
    pub fn load_mapping_from_file(&self, file_path: &std::path::Path) -> Result<(), Box<dyn Error>> {
        let content = std::fs::read_to_string(file_path)?;
        let mapping: MidiMappingConfig = serde_json::from_str(&content)?;
        
        let midi_mapping = self.convert_config_to_mapping(mapping)?;
        self.update_mapping(midi_mapping);
        
        Ok(())
    }

    /// Save MIDI mapping to JSON file
    pub fn save_mapping_to_file(&self, file_path: &std::path::Path) -> Result<(), Box<dyn Error>> {
        let mapping = self.get_mapping();
        let config = self.convert_mapping_to_config(mapping)?;
        
        let json = serde_json::to_string_pretty(&config)?;
        std::fs::write(file_path, json)?;
        
        Ok(())
    }

    /// Convert MidiMapping to serializable config
    fn convert_mapping_to_config(&self, mapping: MidiMapping) -> Result<MidiMappingConfig, Box<dyn Error>> {
        let note_mappings: Vec<NoteMappingConfig> = mapping.note_mappings
            .into_iter()
            .map(|(note, command)| NoteMappingConfig {
                note,
                command: self.command_to_string(command),
            })
            .collect();

        let cc_mappings: Vec<CcMappingConfig> = mapping.cc_mappings
            .into_iter()
            .map(|(cc, function)| CcMappingConfig {
                cc,
                function: self.function_to_string(function),
            })
            .collect();

        Ok(MidiMappingConfig {
            note_mappings,
            cc_mappings,
            channel_filter: mapping.channel_filter,
            enabled: mapping.enabled,
        })
    }

    /// Convert serializable config to MidiMapping
    fn convert_config_to_mapping(&self, config: MidiMappingConfig) -> Result<MidiMapping, Box<dyn Error>> {
        let mut note_mappings = HashMap::new();
        for note_config in config.note_mappings {
            let command = self.string_to_command(&note_config.command)?;
            note_mappings.insert(note_config.note, command);
        }

        let mut cc_mappings = HashMap::new();
        for cc_config in config.cc_mappings {
            let function = self.string_to_function(&cc_config.function)?;
            cc_mappings.insert(cc_config.cc, function);
        }

        Ok(MidiMapping {
            note_mappings,
            cc_mappings,
            channel_filter: config.channel_filter,
            enabled: config.enabled,
        })
    }

    fn command_to_string(&self, command: MidiCommand) -> String {
        match command {
            MidiCommand::NextSlide => "next_slide".to_string(),
            MidiCommand::PreviousSlide => "previous_slide".to_string(),
            MidiCommand::PlaySong => "play_song".to_string(),
            MidiCommand::StopSong => "stop_song".to_string(),
            MidiCommand::VolumeChange { track, volume: _ } => format!("volume_track_{}", track),
            MidiCommand::PanChange { track, pan: _ } => format!("pan_track_{}", track),
            MidiCommand::MuteToggle { track } => format!("mute_track_{}", track),
            MidiCommand::SoloToggle { track } => format!("solo_track_{}", track),
            MidiCommand::TransposeChange { semitones: _ } => "transpose".to_string(),
            MidiCommand::SetTempo { bpm: _ } => "set_tempo".to_string(),
            MidiCommand::TriggerCue { cue_number } => format!("cue_{}", cue_number),
        }
    }

    fn string_to_command(&self, s: &str) -> Result<MidiCommand, Box<dyn Error>> {
        match s {
            "next_slide" => Ok(MidiCommand::NextSlide),
            "previous_slide" => Ok(MidiCommand::PreviousSlide),
            "play_song" => Ok(MidiCommand::PlaySong),
            "stop_song" => Ok(MidiCommand::StopSong),
            "transpose" => Ok(MidiCommand::TransposeChange { semitones: 0 }),
            "set_tempo" => Ok(MidiCommand::SetTempo { bpm: 120 }),
            s if s.starts_with("volume_track_") => {
                let track: u8 = s.replace("volume_track_", "").parse()?;
                Ok(MidiCommand::VolumeChange { track, volume: 0.0 })
            }
            s if s.starts_with("pan_track_") => {
                let track: u8 = s.replace("pan_track_", "").parse()?;
                Ok(MidiCommand::PanChange { track, pan: 0 })
            }
            s if s.starts_with("mute_track_") => {
                let track: u8 = s.replace("mute_track_", "").parse()?;
                Ok(MidiCommand::MuteToggle { track })
            }
            s if s.starts_with("solo_track_") => {
                let track: u8 = s.replace("solo_track_", "").parse()?;
                Ok(MidiCommand::SoloToggle { track })
            }
            s if s.starts_with("cue_") => {
                let cue_number: u8 = s.replace("cue_", "").parse()?;
                Ok(MidiCommand::TriggerCue { cue_number })
            }
            _ => Err(format!("Unknown command: {}", s).into()),
        }
    }

    fn function_to_string(&self, function: MidiFunction) -> String {
        match function {
            MidiFunction::VolumeControl { track } => format!("volume_track_{}", track),
            MidiFunction::PanControl { track } => format!("pan_track_{}", track),
            MidiFunction::TransposeControl => "transpose".to_string(),
            MidiFunction::MasterVolume => "master_volume".to_string(),
            MidiFunction::TempoControl => "tempo".to_string(),
        }
    }

    fn string_to_function(&self, s: &str) -> Result<MidiFunction, Box<dyn Error>> {
        match s {
            "transpose" => Ok(MidiFunction::TransposeControl),
            "master_volume" => Ok(MidiFunction::MasterVolume),
            "tempo" => Ok(MidiFunction::TempoControl),
            s if s.starts_with("volume_track_") => {
                let track: u8 = s.replace("volume_track_", "").parse()?;
                Ok(MidiFunction::VolumeControl { track })
            }
            s if s.starts_with("pan_track_") => {
                let track: u8 = s.replace("pan_track_", "").parse()?;
                Ok(MidiFunction::PanControl { track })
            }
            _ => Err(format!("Unknown function: {}", s).into()),
        }
    }

    /// Get MIDI device info for UI display
    pub fn get_device_info(&self) -> Result<MidiDeviceInfo, Box<dyn Error>> {
        Ok(MidiDeviceInfo {
            input_devices: self.get_available_input_devices()?,
            output_devices: self.get_available_output_devices()?,
            connected_inputs: Vec::new(), // Would track actual connections
            connected_outputs: Vec::new(), // Would track actual connections
        })
    }

    /// Test MIDI connection by sending a test note
    pub fn test_midi_output(&self, device_name: &str) -> Result<(), Box<dyn Error>> {
        // This would temporarily connect and send a test message
        self.connect_output_device(device_name)?;
        
        let test_message = MidiMessage::NoteOn {
            channel: 0,
            note: 60, // C4
            velocity: 100,
        };
        
        self.midi_service.lock().unwrap().send_midi_message(&test_message)?;
        
        // Send note off after 500ms
        std::thread::sleep(std::time::Duration::from_millis(500));
        
        let note_off = MidiMessage::NoteOff {
            channel: 0,
            note: 60,
            velocity: 0,
        };
        
        self.midi_service.lock().unwrap().send_midi_message(&note_off)?;
        
        Ok(())
    }
}

// Serializable configuration structures
#[derive(serde::Serialize, serde::Deserialize)]
pub struct MidiMappingConfig {
    pub note_mappings: Vec<NoteMappingConfig>,
    pub cc_mappings: Vec<CcMappingConfig>,
    pub channel_filter: Option<u8>,
    pub enabled: bool,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct NoteMappingConfig {
    pub note: u8,
    pub command: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct CcMappingConfig {
    pub cc: u8,
    pub function: String,
}

#[derive(Debug, Clone)]
pub struct MidiDeviceInfo {
    pub input_devices: Vec<String>,
    pub output_devices: Vec<String>,
    pub connected_inputs: Vec<String>,
    pub connected_outputs: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_midi_use_case_creation() {
        let use_case = MidiUseCase::new();
        assert!(use_case.is_ok());
    }

    #[test]
    fn test_default_note_mappings() {
        let use_case = MidiUseCase::new().unwrap();
        let mapping = use_case.get_mapping();
        
        assert_eq!(mapping.note_mappings.get(&60), Some(&MidiCommand::NextSlide));
        assert_eq!(mapping.note_mappings.get(&59), Some(&MidiCommand::PreviousSlide));
        assert_eq!(mapping.note_mappings.get(&58), Some(&MidiCommand::PlaySong));
        assert_eq!(mapping.note_mappings.get(&57), Some(&MidiCommand::StopSong));
    }

    #[test]
    fn test_default_cc_mappings() {
        let use_case = MidiUseCase::new().unwrap();
        let mapping = use_case.get_mapping();
        
        assert!(matches!(mapping.cc_mappings.get(&1), Some(MidiFunction::VolumeControl { track: 0 })));
        assert!(matches!(mapping.cc_mappings.get(&7), Some(MidiFunction::MasterVolume)));
        assert!(matches!(mapping.cc_mappings.get(&16), Some(MidiFunction::TransposeControl)));
    }

    #[test]
    fn test_add_note_mapping() {
        let use_case = MidiUseCase::new().unwrap();
        use_case.add_note_mapping(72, MidiCommand::NextSlide); // C5
        
        let mapping = use_case.get_mapping();
        assert_eq!(mapping.note_mappings.get(&72), Some(&MidiCommand::NextSlide));
    }

    #[test]
    fn test_remove_note_mapping() {
        let use_case = MidiUseCase::new().unwrap();
        use_case.remove_note_mapping(60);
        
        let mapping = use_case.get_mapping();
        assert_eq!(mapping.note_mappings.get(&60), None);
    }

    #[test]
    fn test_enable_disable_midi() {
        let use_case = MidiUseCase::new().unwrap();
        
        use_case.set_midi_enabled(false);
        assert!(!use_case.get_mapping().enabled);
        
        use_case.set_midi_enabled(true);
        assert!(use_case.get_mapping().enabled);
    }

    #[test]
    fn test_channel_filter() {
        let use_case = MidiUseCase::new().unwrap();
        
        use_case.set_channel_filter(Some(5));
        assert_eq!(use_case.get_mapping().channel_filter, Some(5));
        
        use_case.set_channel_filter(None);
        assert_eq!(use_case.get_mapping().channel_filter, None);
    }

    #[test]
    fn test_command_to_string_conversion() {
        let use_case = MidiUseCase::new().unwrap();
        
        assert_eq!(use_case.command_to_string(MidiCommand::NextSlide), "next_slide");
        assert_eq!(use_case.command_to_string(MidiCommand::PlaySong), "play_song");
        assert_eq!(use_case.command_to_string(MidiCommand::VolumeChange { track: 2, volume: 0.5 }), "volume_track_2");
        assert_eq!(use_case.command_to_string(MidiCommand::TriggerCue { cue_number: 5 }), "cue_5");
    }

    #[test]
    fn test_string_to_command_conversion() {
        let use_case = MidiUseCase::new().unwrap();
        
        assert_eq!(use_case.string_to_command("next_slide").unwrap(), MidiCommand::NextSlide);
        assert_eq!(use_case.string_to_command("play_song").unwrap(), MidiCommand::PlaySong);
        
        match use_case.string_to_command("volume_track_2").unwrap() {
            MidiCommand::VolumeChange { track, volume: _ } => assert_eq!(track, 2),
            _ => panic!("Expected VolumeChange command"),
        }
        
        match use_case.string_to_command("cue_5").unwrap() {
            MidiCommand::TriggerCue { cue_number } => assert_eq!(cue_number, 5),
            _ => panic!("Expected TriggerCue command"),
        }
    }

    #[test]
    fn test_function_to_string_conversion() {
        let use_case = MidiUseCase::new().unwrap();
        
        assert_eq!(use_case.function_to_string(MidiFunction::MasterVolume), "master_volume");
        assert_eq!(use_case.function_to_string(MidiFunction::TransposeControl), "transpose");
        assert_eq!(use_case.function_to_string(MidiFunction::VolumeControl { track: 3 }), "volume_track_3");
    }

    #[test]
    fn test_string_to_function_conversion() {
        let use_case = MidiUseCase::new().unwrap();
        
        assert!(matches!(use_case.string_to_function("master_volume").unwrap(), MidiFunction::MasterVolume));
        assert!(matches!(use_case.string_to_function("transpose").unwrap(), MidiFunction::TransposeControl));
        
        match use_case.string_to_function("volume_track_3").unwrap() {
            MidiFunction::VolumeControl { track } => assert_eq!(track, 3),
            _ => panic!("Expected VolumeControl function"),
        }
    }

    #[test]
    fn test_mapping_config_serialization() {
        let config = MidiMappingConfig {
            note_mappings: vec![
                NoteMappingConfig { note: 60, command: "next_slide".to_string() },
            ],
            cc_mappings: vec![
                CcMappingConfig { cc: 1, function: "volume_track_0".to_string() },
            ],
            channel_filter: Some(0),
            enabled: true,
        };
        
        let json = serde_json::to_string(&config).unwrap();
        let deserialized: MidiMappingConfig = serde_json::from_str(&json).unwrap();
        
        assert_eq!(deserialized.note_mappings.len(), 1);
        assert_eq!(deserialized.cc_mappings.len(), 1);
        assert_eq!(deserialized.channel_filter, Some(0));
        assert!(deserialized.enabled);
    }

    #[test]
    fn test_invalid_command_string() {
        let use_case = MidiUseCase::new().unwrap();
        let result = use_case.string_to_command("invalid_command");
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_function_string() {
        let use_case = MidiUseCase::new().unwrap();
        let result = use_case.string_to_function("invalid_function");
        assert!(result.is_err());
    }

    #[test]
    fn test_midi_device_info_structure() {
        let device_info = MidiDeviceInfo {
            input_devices: vec!["Input 1".to_string(), "Input 2".to_string()],
            output_devices: vec!["Output 1".to_string()],
            connected_inputs: vec!["Input 1".to_string()],
            connected_outputs: vec![],
        };
        
        assert_eq!(device_info.input_devices.len(), 2);
        assert_eq!(device_info.output_devices.len(), 1);
        assert_eq!(device_info.connected_inputs.len(), 1);
        assert_eq!(device_info.connected_outputs.len(), 0);
    }
}
