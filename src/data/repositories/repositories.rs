// src/infrastructure/repositories.rs
use std::path::{Path, PathBuf};
use crate::core::entities::Pan;

pub struct FileRepository;

impl FileRepository {
    pub fn new() -> Self {
        FileRepository
    }

    pub fn read_file(&self, path: &Path) -> Result<String, Box<dyn std::error::Error>> {
        std::fs::read_to_string(path).map_err(Into::into)
    }
}

pub struct AudioRepository;

impl AudioRepository {
    pub fn new() -> Self {
        AudioRepository
    }

    pub fn list_audio_files(&self, folder: &Path) -> Result<Vec<(String, PathBuf, Pan, bool)>, Box<dyn std::error::Error>> {
        let mut tracks = vec![];
        for entry in std::fs::read_dir(folder)? {
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
                tracks.push((name, path, pan, transpose));
            }
        }
        Ok(tracks)
    }
}

fn is_audio_file(path: &Path) -> bool {
    let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
    matches!(ext.to_lowercase().as_str(), "mp3" | "flac" | "ogg" | "wav" | "m4a")
}

// Unit tests
#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;
    use tempfile::{tempdir, TempDir};

    fn setup_test_dir() -> (TempDir, PathBuf) {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        let mut file = File::create(&file_path).unwrap();
        writeln!(file, "Test content").unwrap();
        (dir, file_path)
    }

    #[test]
    fn test_file_repository_read_file() {
        let repo = FileRepository::new();
        let (_dir, file_path) = setup_test_dir();
        let content = repo.read_file(&file_path).unwrap();
        assert_eq!(content, "Test content\n");
    }

    #[test]
    fn test_file_repository_read_file_nonexistent() {
        let repo = FileRepository::new();
        let result = repo.read_file(&Path::new("nonexistent.txt"));
        assert!(result.is_err());
    }

    #[test]
    fn test_audio_repository_list_audio_files() {
        let repo = AudioRepository::new();
        let dir = tempdir().unwrap();
        let mp3_path = dir.path().join("test.mp3");
        File::create(&mp3_path).unwrap();
        let wav_path = dir.path().join("click.wav");
        File::create(&wav_path).unwrap();
        let txt_path = dir.path().join("ignore.txt");
        File::create(&txt_path).unwrap();

        let tracks = repo.list_audio_files(dir.path()).unwrap();
        assert_eq!(tracks.len(), 2);

        let mut found_test_mp3 = false;
        let mut found_click_wav = false;

        for (name, path, pan, transpose) in tracks {
            if name == "test" {
                assert_eq!(path, mp3_path);
                assert!(matches!(pan, Pan::Right));
                assert!(transpose);
                found_test_mp3 = true;
            } else if name == "click" {
                assert_eq!(path, wav_path);
                assert!(matches!(pan, Pan::Left));
                assert!(!transpose);
                found_click_wav = true;
            } else {
                panic!("Unexpected track found: {}", name);
            }
        }

        assert!(found_test_mp3, "test.mp3 not found");
        assert!(found_click_wav, "click.wav not found");
    }

    #[test]
    fn test_audio_repository_list_audio_files_empty() {
        let repo = AudioRepository::new();
        let dir = tempdir().unwrap();
        let tracks = repo.list_audio_files(dir.path()).unwrap();
        assert_eq!(tracks.len(), 0);
    }

    #[test]
    fn test_is_audio_file() {
        assert!(is_audio_file(&Path::new("song.mp3")));
        assert!(is_audio_file(&Path::new("song.FLAC")));
        assert!(is_audio_file(&Path::new("song.oGg")));
        assert!(is_audio_file(&Path::new("song.WAV")));
        assert!(is_audio_file(&Path::new("song.m4a")));
        assert!(!is_audio_file(&Path::new("song.txt")));
        assert!(!is_audio_file(&Path::new("song")));
    }
}