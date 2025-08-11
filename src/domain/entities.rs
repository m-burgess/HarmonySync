// src/domain/entities.rs
#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct Song {
    pub name: String,
    pub tracks: Vec<Track>,
    pub slides: Vec<Slide>,
    pub metronome: bool,
    pub config: MixerConfig,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct Track {
    pub name: String,
    pub path: std::path::PathBuf,
    pub volume: f32,
    pub pan: Pan,
    pub mute: bool,
    pub solo: bool,
    pub transpose: bool, // Whether to apply global transpose
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub enum Pan {
    Left,
    Center,
    Right,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct Slide {
    pub lines: [String; 2],
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct MixerConfig {
    pub transpose_semitones: i32,
    pub low_cut: f32,
    pub high_cut: f32,
    pub limiter_threshold: f32,
}

// Unit test
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_song_serialization() {
        let song = Song {
            name: "Test".to_string(),
            tracks: vec![],
            slides: vec![],
            metronome: false,
            config: MixerConfig {
                transpose_semitones: 0,
                low_cut: 20.0,
                high_cut: 20000.0,
                limiter_threshold: -6.0,
            },
        };
        let json = serde_json::to_string(&song).unwrap();
        let deserialized: Song = serde_json::from_str(&json).unwrap();
        assert_eq!(song.name, deserialized.name);
    }
}