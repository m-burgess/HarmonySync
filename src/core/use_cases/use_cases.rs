// src/application/use_cases.rs
use crate::core::entities::*;
use crate::data::repositories::repositories::{FileRepository, AudioRepository};

pub struct LoadSongUseCase {
    file_repo: FileRepository,
    audio_repo: AudioRepository,
}

impl LoadSongUseCase {
    pub fn new(file_repo: FileRepository, audio_repo: AudioRepository) -> Self {
        Self { file_repo, audio_repo }
    }

    pub fn execute(&self, song_folder: &std::path::Path) -> Result<Song, Box<dyn std::error::Error>> {
        // Load lyrics.txt
        let lyrics_path = song_folder.join("lyrics.txt");
        let lyrics_text = self.file_repo.read_file(&lyrics_path)?;
        let slides = process_lyrics(&lyrics_text);

        // Load audio files
        let mut tracks = vec![];
        for entry in std::fs::read_dir(song_folder)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_file() && is_audio_file(&path) {
                let name = path.file_stem().unwrap().to_string_lossy().to_string();
                let pan = if name.to_lowercase().contains("click") || name.to_lowercase().contains("guide") {
                    Pan::Left
                } else {
                    Pan::Right
                };
                let transpose = !name.to_lowercase().contains("click") && !name.to_lowercase().contains("guide") && !name.to_lowercase().contains("drums") && !name.to_lowercase().contains("percussion");
                tracks.push(Track {
                    name,
                    path,
                    volume: 1.0,
                    pan,
                    mute: false,
                    solo: false,
                    transpose,
                });
            }
        }

        // Load config if exists
        let config_path = song_folder.join("config.json");
        let config = if config_path.exists() {
            let config_text = self.file_repo.read_file(&config_path)?;
            serde_json::from_str(&config_text)?
        } else {
            MixerConfig {
                transpose_semitones: 0,
                low_cut: 20.0,
                high_cut: 20000.0,
                limiter_threshold: -6.0,
            }
        };

        Ok(Song {
            name: song_folder.file_name().unwrap().to_string_lossy().to_string(),
            tracks,
            slides,
            metronome: false,
            config,
        })
    }
}

fn process_lyrics(text: &str) -> Vec<Slide> {
    let lines: Vec<String> = text.lines().map(|l| l.trim().to_string()).filter(|l| !l.is_empty()).collect();
    let mut slides = vec![];
    for chunk in lines.chunks(2) {
        let mut lines_arr = ["".to_string(), "".to_string()];
        if let Some(line1) = chunk.get(0) {
            lines_arr[0] = line1.clone();
        }
        if let Some(line2) = chunk.get(1) {
            lines_arr[1] = line2.clone();
        }
        slides.push(Slide { lines: lines_arr });
    }
    slides
}

fn is_audio_file(path: &std::path::Path) -> bool {
    let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
    matches!(ext.to_lowercase().as_str(), "mp3" | "flac" | "ogg" | "wav" | "m4a")
}

// Unit test
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_lyrics() {
        let text = "Line one\nLine two\nLine three";
        let slides = process_lyrics(&text);
        assert_eq!(slides.len(), 2);
        assert_eq!(slides[0].lines, ["Line one".to_string(), "Line two".to_string()]);
        assert_eq!(slides[1].lines, ["Line three".to_string(), "".to_string()]);
    }
}

// Similar for other use cases: PlayMultitrackUseCase, TransposeUseCase, etc.