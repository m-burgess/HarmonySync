use anyhow::{Result, anyhow};
use reqwest;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs;
use log::{info, warn, error};

use crate::domain::entities::{PlanningCenterSong, SongLyricsRequest, SongLyricsResult, ImportedSong};

/// Service for importing songs from Planning Center and fetching lyrics
pub struct SongImportService {
    client: reqwest::Client,
}

impl SongImportService {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::builder()
                .user_agent("HarmonySync/1.0")
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .expect("Failed to create HTTP client"),
        }
    }

    /// Fetch songs from Planning Center Services API
    /// Requires an API token to be configured
    pub async fn fetch_planning_center_songs(
        &self,
        app_id: &str,
        secret: &str,
        service_type_id: Option<&str>,
    ) -> Result<Vec<PlanningCenterSong>> {
        info!("Fetching songs from Planning Center");
        
        let base_url = "https://api.planningcenteronline.com/services/v2";
        let url = if let Some(service_id) = service_type_id {
            format!("{}/service_types/{}/plans", base_url, service_id)
        } else {
            format!("{}/songs", base_url)
        };

        let response = self.client
            .get(&url)
            .basic_auth(app_id, Some(secret))
            .send()
            .await
            .map_err(|e| anyhow!("Failed to fetch from Planning Center: {}", e))?;

        if !response.status().is_success() {
            return Err(anyhow!("Planning Center API returned error: {}", response.status()));
        }

        let json: serde_json::Value = response.json().await
            .map_err(|e| anyhow!("Failed to parse Planning Center response: {}", e))?;

        // Parse the response based on Planning Center API structure
        let songs = self.parse_planning_center_response(json)?;
        
        info!("Fetched {} songs from Planning Center", songs.len());
        Ok(songs)
    }

    fn parse_planning_center_response(&self, json: serde_json::Value) -> Result<Vec<PlanningCenterSong>> {
        let mut songs = Vec::new();
        
        if let Some(data) = json.get("data").and_then(|d| d.as_array()) {
            for item in data {
                if let Some(attrs) = item.get("attributes").and_then(|a| a.as_object()) {
                    let song = PlanningCenterSong {
                        id: item.get("id")
                            .and_then(|i| i.as_str())
                            .unwrap_or("")
                            .to_string(),
                        title: attrs.get("title")
                            .and_then(|t| t.as_str())
                            .unwrap_or("Untitled")
                            .to_string(),
                        author: attrs.get("author")
                            .and_then(|a| a.as_str())
                            .map(|s| s.to_string()),
                        ccli_number: attrs.get("ccli_number")
                            .and_then(|c| c.as_str())
                            .map(|s| s.to_string()),
                    };
                    songs.push(song);
                }
            }
        }
        
        Ok(songs)
    }

    /// Fetch lyrics from multiple sources and aggregate them
    /// Priority: SongSelect (if available) -> Genius -> other sources
    pub async fn fetch_lyrics(&self, request: &SongLyricsRequest) -> Result<SongLyricsResult> {
        info!("Fetching lyrics for: {}", request.title);

        // Try Genius API first (free tier available)
        match self.fetch_from_genius(&request.title, request.artist.as_deref()).await {
            Ok(lyrics) => {
                info!("Successfully fetched lyrics from Genius");
                return Ok(SongLyricsResult {
                    title: request.title.clone(),
                    lyrics,
                    source: "genius".to_string(),
                });
            }
            Err(e) => {
                warn!("Failed to fetch from Genius: {}", e);
            }
        }

        // If all sources fail, return an error
        Err(anyhow!("Could not fetch lyrics from any source for: {}", request.title))
    }

    /// Fetch lyrics from Genius API
    async fn fetch_from_genius(&self, title: &str, artist: Option<&str>) -> Result<String> {
        // Note: Genius API requires an access token
        // For a minimal implementation, we'll return a placeholder
        // In production, this would use the Genius API with proper authentication
        
        let search_query = if let Some(artist_name) = artist {
            format!("{} {}", artist_name, title)
        } else {
            title.to_string()
        };

        // This is a simplified version - actual implementation would:
        // 1. Search for the song using Genius search API
        // 2. Get the song URL from search results
        // 3. Scrape or fetch lyrics from the song page
        
        warn!("Genius API integration not yet implemented - returning placeholder");
        Ok(format!("[Lyrics for: {}]\n\nPlease manually add lyrics here.", title))
    }

    /// Save lyrics to a text file in the downloads folder
    pub fn save_lyrics_to_file(
        &self,
        song_title: &str,
        lyrics: &str,
        downloads_dir: &PathBuf,
    ) -> Result<ImportedSong> {
        info!("Saving lyrics for: {}", song_title);

        // Create downloads directory if it doesn't exist
        if !downloads_dir.exists() {
            fs::create_dir_all(downloads_dir)
                .map_err(|e| anyhow!("Failed to create downloads directory: {}", e))?;
        }

        // Sanitize filename
        let safe_filename = self.sanitize_filename(song_title);
        let file_path = downloads_dir.join(format!("{}.txt", safe_filename));

        // Format lyrics with proper sections
        let formatted_lyrics = self.format_lyrics_with_sections(lyrics);

        // Write to file
        fs::write(&file_path, &formatted_lyrics)
            .map_err(|e| anyhow!("Failed to write lyrics file: {}", e))?;

        info!("Saved lyrics to: {}", file_path.display());

        Ok(ImportedSong {
            title: song_title.to_string(),
            lyrics: formatted_lyrics,
            file_path: file_path.to_string_lossy().to_string(),
        })
    }

    /// Sanitize filename to remove invalid characters
    fn sanitize_filename(&self, filename: &str) -> String {
        filename
            .chars()
            .map(|c| match c {
                '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
                _ => c,
            })
            .collect()
    }

    /// Format lyrics with common song sections
    fn format_lyrics_with_sections(&self, lyrics: &str) -> String {
        // This is a simple formatter that preserves existing structure
        // and adds section markers if they don't exist
        
        let mut formatted = String::new();
        let lines: Vec<&str> = lyrics.lines().collect();
        
        for line in lines {
            let trimmed = line.trim();
            
            // Check if line is already a section marker
            if trimmed.starts_with('[') && trimmed.ends_with(']') {
                formatted.push_str(line);
                formatted.push('\n');
            } else if !trimmed.is_empty() {
                formatted.push_str(line);
                formatted.push('\n');
            } else {
                formatted.push('\n');
            }
        }
        
        formatted
    }

    /// Perform spell checking on lyrics
    /// Returns a list of potentially misspelled words
    pub fn spell_check_lyrics(&self, lyrics: &str) -> Vec<String> {
        // Basic spell check implementation
        // In a full implementation, this would use a proper spell checking library
        
        let mut potential_errors = Vec::new();
        
        // For now, just check for common issues
        for word in lyrics.split_whitespace() {
            let cleaned = word.trim_matches(|c: char| !c.is_alphabetic());
            
            // Check for repeated characters (common typo)
            if cleaned.len() > 3 && self.has_repeated_chars(cleaned) {
                potential_errors.push(cleaned.to_string());
            }
        }
        
        potential_errors
    }

    fn has_repeated_chars(&self, word: &str) -> bool {
        let chars: Vec<char> = word.chars().collect();
        for i in 0..chars.len().saturating_sub(2) {
            if chars[i] == chars[i + 1] && chars[i] == chars[i + 2] {
                return true;
            }
        }
        false
    }
}

impl Default for SongImportService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_filename() {
        let service = SongImportService::new();
        assert_eq!(service.sanitize_filename("Song: Name?"), "Song_ Name_");
        assert_eq!(service.sanitize_filename("Normal Song"), "Normal Song");
    }

    #[test]
    fn test_format_lyrics_with_sections() {
        let service = SongImportService::new();
        let input = "[Verse 1]\nLine 1\nLine 2\n\n[Chorus]\nChorus line";
        let formatted = service.format_lyrics_with_sections(input);
        assert!(formatted.contains("[Verse 1]"));
        assert!(formatted.contains("[Chorus]"));
    }

    #[test]
    fn test_spell_check_basic() {
        let service = SongImportService::new();
        let lyrics = "This is a tesssst with errorrrr";
        let errors = service.spell_check_lyrics(lyrics);
        assert!(!errors.is_empty());
    }
}
