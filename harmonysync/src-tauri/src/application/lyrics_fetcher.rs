use anyhow::{Result, Context};
use reqwest;
use serde::{Deserialize, Serialize};
use log::{info, warn, error};
use std::time::Duration;

/// Structure to hold Genius API search results
#[derive(Debug, Deserialize)]
struct GeniusSearchResponse {
    response: GeniusResponse,
}

#[derive(Debug, Deserialize)]
struct GeniusResponse {
    hits: Vec<GeniusHit>,
}

#[derive(Debug, Deserialize)]
struct GeniusHit {
    result: GeniusResult,
}

#[derive(Debug, Deserialize)]
struct GeniusResult {
    id: i64,
    title: String,
    artist_names: String,
    url: String,
}

/// Result structure for lyrics fetching
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LyricsResult {
    pub title: String,
    pub artist: String,
    pub lyrics: String,
    pub source: String,
}

/// Genius API client for fetching lyrics
pub struct GeniusClient {
    access_token: Option<String>,
    client: reqwest::Client,
}

impl GeniusClient {
    /// Create a new Genius client
    /// Note: Genius API can work without authentication for searches,
    /// but requires scraping the webpage for lyrics since the API doesn't provide them directly
    pub fn new(access_token: Option<String>) -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");
        
        Self {
            access_token,
            client,
        }
    }

    /// Search for a song on Genius
    pub async fn search_song(&self, query: &str) -> Result<Vec<GeniusResult>> {
        let url = format!(
            "https://api.genius.com/search?q={}",
            urlencoding::encode(query)
        );

        let mut request = self.client.get(&url);
        
        // Add authorization header if token is available
        if let Some(token) = &self.access_token {
            request = request.header("Authorization", format!("Bearer {}", token));
        }

        let response = request
            .send()
            .await
            .context("Failed to send search request to Genius API")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("Genius API search failed with status {}: {}", status, error_text);
        }

        let search_response: GeniusSearchResponse = response
            .json()
            .await
            .context("Failed to parse Genius API search response")?;

        Ok(search_response.response.hits.into_iter().map(|hit| hit.result).collect())
    }

    /// Fetch lyrics from a Genius song URL by scraping the webpage
    /// Note: This is a simple scraping approach. In production, consider using a dedicated HTML parser like scraper or select.rs
    pub async fn fetch_lyrics_from_url(&self, url: &str) -> Result<String> {
        info!("Fetching lyrics from Genius URL: {}", url);
        
        let response = self.client
            .get(url)
            .send()
            .await
            .context("Failed to fetch Genius song page")?;

        if !response.status().is_success() {
            anyhow::bail!("Failed to fetch song page: status {}", response.status());
        }

        let html = response.text().await?;
        
        // Extract lyrics from the HTML
        // Genius stores lyrics in div elements with data-lyrics-container attribute
        let lyrics = self.extract_lyrics_from_html(&html)?;
        
        Ok(lyrics)
    }

    /// Extract lyrics from Genius HTML page
    /// This is a simple extraction - looks for the lyrics container in the HTML
    fn extract_lyrics_from_html(&self, html: &str) -> Result<String> {
        // Look for lyrics containers in the HTML
        // Genius uses <div data-lyrics-container="true"> elements
        let mut lyrics_parts = Vec::new();
        
        // Simple pattern matching for lyrics containers
        // In a production system, use a proper HTML parser
        let container_start = "data-lyrics-container=\"true\"";
        let mut search_pos = 0;
        
        while let Some(container_pos) = html[search_pos..].find(container_start) {
            let start_pos = search_pos + container_pos;
            
            // Find the opening > of the div
            if let Some(content_start) = html[start_pos..].find('>') {
                let content_start_abs = start_pos + content_start + 1;
                
                // Find the closing </div>
                if let Some(content_end) = html[content_start_abs..].find("</div>") {
                    let content_end_abs = content_start_abs + content_end;
                    let content = &html[content_start_abs..content_end_abs];
                    
                    // Clean up HTML tags and entities
                    let cleaned = self.clean_html_content(content);
                    lyrics_parts.push(cleaned);
                }
            }
            
            search_pos = start_pos + container_start.len();
        }
        
        if lyrics_parts.is_empty() {
            anyhow::bail!("Could not extract lyrics from the page");
        }
        
        Ok(lyrics_parts.join("\n\n"))
    }

    /// Clean HTML content - remove tags and decode entities
    fn clean_html_content(&self, content: &str) -> String {
        let mut result = String::new();
        let mut in_tag = false;
        let mut chars = content.chars().peekable();
        
        while let Some(ch) = chars.next() {
            match ch {
                '<' => {
                    // Check for <br> tags and convert to newlines
                    let remaining: String = chars.clone().take(3).collect();
                    if remaining.starts_with("br") {
                        result.push('\n');
                    }
                    in_tag = true;
                }
                '>' => {
                    in_tag = false;
                }
                _ if !in_tag => {
                    result.push(ch);
                }
                _ => {}
            }
        }
        
        // Decode common HTML entities
        result = result
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#x27;", "'")
            .replace("&#x2F;", "/")
            .replace("&nbsp;", " ");
        
        // Clean up whitespace
        result
            .lines()
            .map(|line| line.trim())
            .collect::<Vec<_>>()
            .join("\n")
    }

    /// Search and fetch lyrics for a song
    pub async fn get_lyrics(&self, song_title: &str, artist: Option<&str>) -> Result<LyricsResult> {
        // Build search query
        let query = if let Some(artist_name) = artist {
            format!("{} {}", song_title, artist_name)
        } else {
            song_title.to_string()
        };

        info!("Searching Genius for: {}", query);
        
        // Search for the song
        let results = self.search_song(&query).await?;
        
        if results.is_empty() {
            anyhow::bail!("No results found on Genius for: {}", query);
        }

        // Use the first result
        let first_result = &results[0];
        info!("Found song on Genius: {} by {}", first_result.title, first_result.artist_names);
        
        // Fetch lyrics from the song page
        let lyrics = self.fetch_lyrics_from_url(&first_result.url).await?;
        
        Ok(LyricsResult {
            title: first_result.title.clone(),
            artist: first_result.artist_names.clone(),
            lyrics,
            source: "Genius".to_string(),
        })
    }
}

/// Simple lyrics formatter that attempts to identify song sections
pub fn format_lyrics_with_sections(lyrics: &str) -> String {
    let mut formatted = String::new();
    let lines: Vec<&str> = lyrics.lines().collect();
    
    for line in lines {
        let trimmed = line.trim();
        
        // Skip empty lines
        if trimmed.is_empty() {
            formatted.push('\n');
            continue;
        }
        
        // Check if line looks like a section header (all caps or starts with brackets)
        if is_section_header(trimmed) {
            // Already formatted as a section
            formatted.push_str(trimmed);
        } else {
            formatted.push_str(trimmed);
        }
        formatted.push('\n');
    }
    
    formatted
}

/// Check if a line looks like a section header
fn is_section_header(line: &str) -> bool {
    // Common patterns for section headers
    if line.starts_with('[') && line.ends_with(']') {
        return true;
    }
    
    // Check if line is all caps and not too long (likely a section name)
    if line.len() < 30 && line.chars().all(|c| !c.is_lowercase() || !c.is_alphabetic()) {
        let alpha_chars: Vec<char> = line.chars().filter(|c| c.is_alphabetic()).collect();
        if !alpha_chars.is_empty() && alpha_chars.iter().all(|c| c.is_uppercase()) {
            return true;
        }
    }
    
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_section_header_detection() {
        assert!(is_section_header("[Verse 1]"));
        assert!(is_section_header("[Chorus]"));
        assert!(is_section_header("VERSE 1"));
        assert!(is_section_header("CHORUS"));
        assert!(!is_section_header("This is a normal lyric line"));
        assert!(!is_section_header("This is also normal"));
    }

    #[test]
    fn test_format_lyrics() {
        let input = "[Verse 1]\nLine 1\nLine 2\n\n[Chorus]\nChorus line";
        let formatted = format_lyrics_with_sections(input);
        assert!(formatted.contains("[Verse 1]"));
        assert!(formatted.contains("[Chorus]"));
    }
}
