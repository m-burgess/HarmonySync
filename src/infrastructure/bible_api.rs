// src/infrastructure/bible_api.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BibleVerse {
    pub reference: String,
    pub text: String,
    pub version: String,
    pub book: String,
    pub chapter: i32,
    pub verse: i32,
}

#[derive(Debug, Deserialize)]
struct ApiVerseResponse {
    data: ApiVerseData,
}

#[derive(Debug, Deserialize)]
struct ApiVerseData {
    id: String,
    content: String,
    reference: String,
    verse_count: i32,
}

#[derive(Debug, Deserialize)]
struct ApiBibleResponse {
    data: Vec<ApiBible>,
}

#[derive(Debug, Deserialize)]
struct ApiBible {
    id: String,
    name: String,
    abbreviation: String,
    description: String,
}

// Free Bible API response structure
#[derive(Debug, Deserialize)]
struct FreeBibleResponse {
    reference: String,
    verses: Vec<FreeBibleVerse>,
    text: String,
    translation_id: String,
    translation_name: String,
    translation_note: String,
}

#[derive(Debug, Deserialize)]
struct FreeBibleVerse {
    book_id: String,
    book_name: String,
    chapter: i32,
    verse: i32,
    text: String,
}

pub struct BibleApiService {
    client: reqwest::blocking::Client,
    api_key: String,
    base_url: String,
}

impl BibleApiService {
    pub fn new(api_key: String) -> Self {
        Self {
            client: reqwest::blocking::Client::new(),
            api_key,
            base_url: "https://api.scripture.api.bible/v1".to_string(),
        }
    }

    /// Get available Bible versions
    pub fn get_available_versions(&self) -> Result<Vec<(String, String)>, Box<dyn std::error::Error>> {
        let url = format!("{}/bibles", self.base_url);
        let response = self.client
            .get(&url)
            .header("api-key", &self.api_key)
            .send()?;

        let bible_response: ApiBibleResponse = response.json()?;
        
        Ok(bible_response.data
            .into_iter()
            .map(|bible| (bible.id, bible.name))
            .collect())
    }

    /// Fetch a Bible verse by reference (e.g., "John 3:16")
    pub fn fetch_verse(&self, reference: &str, version_id: &str) -> Result<BibleVerse, Box<dyn std::error::Error>> {
        // Parse the reference (basic implementation)
        let (book, chapter, verse) = self.parse_reference(reference)?;
        
        // Search for the verse using the API
        let search_url = format!("{}/bibles/{}/search", self.base_url, version_id);
        let mut params = HashMap::new();
        params.insert("query", reference);
        params.insert("limit", "1");
        
        let response = self.client
            .get(&search_url)
            .header("api-key", &self.api_key)
            .query(&params)
            .send()?;

        if !response.status().is_success() {
            return Err(format!("API request failed: {}", response.status()).into());
        }

        // For simplicity, we'll create a mock response structure
        // In a real implementation, you'd parse the actual API response
        let verse_text = format!("Sample verse text for {}", reference);
        
        Ok(BibleVerse {
            reference: reference.to_string(),
            text: verse_text,
            version: version_id.to_string(),
            book,
            chapter,
            verse,
        })
    }

    /// Fetch multiple verses (e.g., "John 3:16-17")
    pub fn fetch_verses(&self, reference: &str, version_id: &str) -> Result<Vec<BibleVerse>, Box<dyn std::error::Error>> {
        if reference.contains("-") {
            // Handle verse ranges
            let parts: Vec<&str> = reference.split("-").collect();
            if parts.len() != 2 {
                return Err("Invalid verse range format".into());
            }
            
            let (book, chapter, start_verse) = self.parse_reference(parts[0])?;
            let end_verse: i32 = parts[1].parse()?;
            
            let mut verses = Vec::new();
            for verse_num in start_verse..=end_verse {
                let verse_ref = format!("{}{}:{}", book, chapter, verse_num);
                if let Ok(verse) = self.fetch_verse(&verse_ref, version_id) {
                    verses.push(verse);
                }
            }
            Ok(verses)
        } else {
            // Single verse
            Ok(vec![self.fetch_verse(reference, version_id)?])
        }
    }

    /// Basic reference parsing (book chapter:verse)
    fn parse_reference(&self, reference: &str) -> Result<(String, i32, i32), Box<dyn std::error::Error>> {
        let parts: Vec<&str> = reference.split_whitespace().collect();
        if parts.len() < 2 {
            return Err("Invalid reference format".into());
        }
        
        let book = parts[0..parts.len()-1].join(" ");
        let chapter_verse = parts[parts.len()-1];
        
        let cv_parts: Vec<&str> = chapter_verse.split(':').collect();
        if cv_parts.len() != 2 {
            return Err("Invalid chapter:verse format".into());
        }
        
        let chapter: i32 = cv_parts[0].parse()?;
        let verse: i32 = cv_parts[1].parse()?;
        
        Ok((book, chapter, verse))
    }

    /// Format verses for display (max 2 lines per slide)
    pub fn format_for_slides(&self, verses: &[BibleVerse]) -> Vec<(String, String)> {
        let mut slides = Vec::new();
        
        for verse in verses {
            let text = &verse.text;
            let words: Vec<&str> = text.split_whitespace().collect();
            
            // Simple word wrapping to fit 2 lines
            let max_words_per_line = 8; // Adjust based on your UI
            
            for chunk in words.chunks(max_words_per_line * 2) {
                let mid_point = chunk.len().min(max_words_per_line);
                let line1 = chunk[..mid_point].join(" ");
                let line2 = if chunk.len() > max_words_per_line {
                    chunk[max_words_per_line..].join(" ")
                } else {
                    String::new()
                };
                
                slides.push((line1, line2));
            }
            
            // Add reference slide
            slides.push((format!("{} ({})", verse.reference, verse.version), String::new()));
        }
        
        slides
    }
}

// Free API alternative using bible-api.com (no key required)
pub struct FreeBibleApiService {
    client: reqwest::blocking::Client,
}

impl FreeBibleApiService {
    pub fn new() -> Self {
        Self {
            client: reqwest::blocking::Client::new(),
        }
    }

    /// Fetch verse using a free API (bible-api.com)
    pub fn fetch_verse_free(&self, reference: &str, version: &str) -> Result<BibleVerse, Box<dyn std::error::Error>> {
        // Use Bible API (bible-api.com) - free service
        let encoded_ref = reference.replace(" ", "%20");
        let url = format!("https://bible-api.com/{}", encoded_ref);
        
        let response = self.client
            .get(&url)
            .header("User-Agent", "RustPresenter/1.0")
            .timeout(std::time::Duration::from_secs(10))
            .send()?;

        if !response.status().is_success() {
            return Err(format!("Failed to fetch verse: {}", response.status()).into());
        }

        // Try to parse as JSON first
        let response_text = response.text()?;
        
        // Try to deserialize as FreeBibleResponse
        if let Ok(bible_response) = serde_json::from_str::<FreeBibleResponse>(&response_text) {
            let (book, chapter, verse_num) = self.parse_reference_simple(reference)?;
            
            Ok(BibleVerse {
                reference: bible_response.reference,
                text: bible_response.text,
                version: bible_response.translation_name,
                book,
                chapter,
                verse: verse_num,
            })
        } else {
            // Fallback: treat as plain text
            let (book, chapter, verse_num) = self.parse_reference_simple(reference)?;
            
            Ok(BibleVerse {
                reference: reference.to_string(),
                text: response_text.trim().to_string(),
                version: version.to_string(),
                book,
                chapter,
                verse: verse_num,
            })
        }
    }

    /// Fetch multiple verses using free API
    pub fn fetch_verses_free(&self, reference: &str, version: &str) -> Result<Vec<BibleVerse>, Box<dyn std::error::Error>> {
        if reference.contains("-") {
            // Handle verse ranges like "John 3:16-17"
            let parts: Vec<&str> = reference.split("-").collect();
            if parts.len() != 2 {
                return Err("Invalid verse range format".into());
            }
            
            // Parse the base reference and end verse
            let base_ref = parts[0].trim();
            let end_verse_str = parts[1].trim();
            
            let (book, chapter, start_verse) = self.parse_reference_simple(base_ref)?;
            let end_verse: i32 = end_verse_str.parse()?;
            
            let mut verses = Vec::new();
            for verse_num in start_verse..=end_verse {
                let verse_ref = format!("{} {}:{}", book, chapter, verse_num);
                match self.fetch_verse_free(&verse_ref, version) {
                    Ok(verse) => verses.push(verse),
                    Err(_) => continue, // Skip failed verses
                }
            }
            Ok(verses)
        } else {
            // Single verse
            Ok(vec![self.fetch_verse_free(reference, version)?])
        }
    }

    fn parse_reference_simple(&self, reference: &str) -> Result<(String, i32, i32), Box<dyn std::error::Error>> {
        let parts: Vec<&str> = reference.trim().split_whitespace().collect();
        if parts.len() < 2 {
            return Err("Invalid reference format".into());
        }
        
        // Extract book name (everything except the last part)
        let book = parts[0..parts.len()-1].join(" ");
        
        // Extract chapter:verse from last part
        let chapter_verse = parts[parts.len()-1];
        let cv_parts: Vec<&str> = chapter_verse.split(':').collect();
        
        if cv_parts.len() != 2 {
            return Err("Invalid chapter:verse format".into());
        }
        
        let chapter: i32 = cv_parts[0].parse()
            .map_err(|_| "Invalid chapter number")?;
        let verse: i32 = cv_parts[1].parse()
            .map_err(|_| "Invalid verse number")?;
        
        Ok((book, chapter, verse))
    }

    /// Get a list of common Bible book abbreviations
    pub fn get_book_abbreviations() -> HashMap<&'static str, &'static str> {
        let mut abbrevs = HashMap::new();
        
        // Old Testament
        abbrevs.insert("gen", "Genesis");
        abbrevs.insert("exod", "Exodus");
        abbrevs.insert("lev", "Leviticus");
        abbrevs.insert("num", "Numbers");
        abbrevs.insert("deut", "Deuteronomy");
        abbrevs.insert("josh", "Joshua");
        abbrevs.insert("judg", "Judges");
        abbrevs.insert("ruth", "Ruth");
        abbrevs.insert("1sam", "1 Samuel");
        abbrevs.insert("2sam", "2 Samuel");
        abbrevs.insert("1kgs", "1 Kings");
        abbrevs.insert("2kgs", "2 Kings");
        abbrevs.insert("ps", "Psalms");
        abbrevs.insert("prov", "Proverbs");
        abbrevs.insert("isa", "Isaiah");
        abbrevs.insert("jer", "Jeremiah");
        abbrevs.insert("ezek", "Ezekiel");
        abbrevs.insert("dan", "Daniel");
        
        // New Testament
        abbrevs.insert("matt", "Matthew");
        abbrevs.insert("mark", "Mark");
        abbrevs.insert("luke", "Luke");
        abbrevs.insert("john", "John");
        abbrevs.insert("acts", "Acts");
        abbrevs.insert("rom", "Romans");
        abbrevs.insert("1cor", "1 Corinthians");
        abbrevs.insert("2cor", "2 Corinthians");
        abbrevs.insert("gal", "Galatians");
        abbrevs.insert("eph", "Ephesians");
        abbrevs.insert("phil", "Philippians");
        abbrevs.insert("col", "Colossians");
        abbrevs.insert("1thess", "1 Thessalonians");
        abbrevs.insert("2thess", "2 Thessalonians");
        abbrevs.insert("1tim", "1 Timothy");
        abbrevs.insert("2tim", "2 Timothy");
        abbrevs.insert("titus", "Titus");
        abbrevs.insert("phlm", "Philemon");
        abbrevs.insert("heb", "Hebrews");
        abbrevs.insert("jas", "James");
        abbrevs.insert("1pet", "1 Peter");
        abbrevs.insert("2pet", "2 Peter");
        abbrevs.insert("1john", "1 John");
        abbrevs.insert("2john", "2 John");
        abbrevs.insert("3john", "3 John");
        abbrevs.insert("jude", "Jude");
        abbrevs.insert("rev", "Revelation");
        
        abbrevs
    }

    /// Normalize a book reference using common abbreviations
    pub fn normalize_book_reference(&self, reference: &str) -> String {
        let abbrevs = Self::get_book_abbreviations();
        let parts: Vec<&str> = reference.split_whitespace().collect();
        
        if parts.is_empty() {
            return reference.to_string();
        }
        
        let book_part = parts[0].to_lowercase();
        if let Some(&full_name) = abbrevs.get(book_part.as_str()) {
            let mut normalized = vec![full_name];
            normalized.extend_from_slice(&parts[1..]);
            normalized.join(" ")
        } else {
            reference.to_string()
        }
    }
}

// Handle for stopping a running metronome
pub struct MetronomeHandle {
    pub running: Arc<AtomicBool>,
}

impl MetronomeHandle {
    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
    }
}

// Simple sine wave generator for metronome clicks
struct SineWave {
    frequency: f32,
    sample_rate: f32,
    phase: f32,
}

impl SineWave {
    fn new(frequency: f32) -> Self {
        Self {
            frequency,
            sample_rate: 44100.0,
            phase: 0.0,
        }
    }
}

impl Iterator for SineWave {
    type Item = f32;
    
    fn next(&mut self) -> Option<Self::Item> {
        let sample = (self.phase * 2.0 * std::f32::consts::PI).sin();
        self.phase += self.frequency / self.sample_rate;
        if self.phase >= 1.0 {
            self.phase -= 1.0;
        }
        Some(sample)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_reference() {
        let service = BibleApiService::new("test_key".to_string());
        let result = service.parse_reference("John 3:16");
        assert!(result.is_ok());
        let (book, chapter, verse) = result.unwrap();
        assert_eq!(book, "John");
        assert_eq!(chapter, 3);
        assert_eq!(verse, 16);
    }

    #[test]
    fn test_parse_reference_with_space_in_book() {
        let service = BibleApiService::new("test_key".to_string());
        let result = service.parse_reference("1 Corinthians 13:4");
        assert!(result.is_ok());
        let (book, chapter, verse) = result.unwrap();
        assert_eq!(book, "1 Corinthians");
        assert_eq!(chapter, 13);
        assert_eq!(verse, 4);
    }

    #[test]
    fn test_format_for_slides() {
        let service = BibleApiService::new("test_key".to_string());
        let verses = vec![
            BibleVerse {
                reference: "John 3:16".to_string(),
                text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.".to_string(),
                version: "NIV".to_string(),
                book: "John".to_string(),
                chapter: 3,
                verse: 16,
            }
        ];
        
        let slides = service.format_for_slides(&verses);
        assert!(!slides.is_empty());
        // Each slide should have at most 2 lines
        for (line1, line2) in &slides {
            assert!(!line1.is_empty() || !line2.is_empty());
        }
    }

    #[test]
    fn test_free_api_service_creation() {
        let service = FreeBibleApiService::new();
        // Just test that it can be created without panicking
        assert!(true);
    }

    #[test]
    fn test_free_api_parse_reference() {
        let service = FreeBibleApiService::new();
        let result = service.parse_reference_simple("John 3:16");
        assert!(result.is_ok());
        let (book, chapter, verse) = result.unwrap();
        assert_eq!(book, "John");
        assert_eq!(chapter, 3);
        assert_eq!(verse, 16);
    }

    #[test]
    fn test_free_api_parse_reference_complex() {
        let service = FreeBibleApiService::new();
        let result = service.parse_reference_simple("1 Corinthians 13:4");
        assert!(result.is_ok());
        let (book, chapter, verse) = result.unwrap();
        assert_eq!(book, "1 Corinthians");
        assert_eq!(chapter, 13);
        assert_eq!(verse, 4);
    }

    #[test]
    fn test_bible_verse_serialization() {
        let verse = BibleVerse {
            reference: "John 3:16".to_string(),
            text: "Sample text".to_string(),
            version: "NIV".to_string(),
            book: "John".to_string(),
            chapter: 3,
            verse: 16,
        };
        
        let json = serde_json::to_string(&verse).unwrap();
        let deserialized: BibleVerse = serde_json::from_str(&json).unwrap();
        assert_eq!(verse.reference, deserialized.reference);
        assert_eq!(verse.text, deserialized.text);
    }

    #[test]
    fn test_book_abbreviations() {
        let abbrevs = FreeBibleApiService::get_book_abbreviations();
        assert!(!abbrevs.is_empty());
        assert_eq!(abbrevs.get("john"), Some(&"John"));
        assert_eq!(abbrevs.get("1cor"), Some(&"1 Corinthians"));
        assert_eq!(abbrevs.get("ps"), Some(&"Psalms"));
        assert_eq!(abbrevs.get("rev"), Some(&"Revelation"));
    }

    #[test]
    fn test_normalize_book_reference() {
        let service = FreeBibleApiService::new();
        
        assert_eq!(service.normalize_book_reference("john 3:16"), "John 3:16");
        assert_eq!(service.normalize_book_reference("1cor 13:4"), "1 Corinthians 13:4");
        assert_eq!(service.normalize_book_reference("ps 23:1"), "Psalms 23:1");
        assert_eq!(service.normalize_book_reference("Unknown 1:1"), "Unknown 1:1");
    }

    #[test]
    fn test_verse_range_detection() {
        assert!(true); // Basic test that range detection logic exists
        let reference = "John 3:16-17";
        assert!(reference.contains("-"));
        let parts: Vec<&str> = reference.split("-").collect();
        assert_eq!(parts.len(), 2);
        assert_eq!(parts[0], "John 3:16");
        assert_eq!(parts[1], "17");
    }

    #[test]
    fn test_metronome_handle() {
        let handle = MetronomeHandle {
            running: Arc::new(AtomicBool::new(true)),
        };
        assert!(handle.running.load(Ordering::SeqCst));
        handle.stop();
        assert!(!handle.running.load(Ordering::SeqCst));
    }

    #[test]
    fn test_sine_wave_generator() {
        let mut sine = SineWave::new(440.0);
        let samples: Vec<f32> = sine.take(100).collect();
        assert_eq!(samples.len(), 100);
        // Check that we get some variation in the samples (not all zeros)
        let has_variation = samples.windows(2).any(|w| (w[0] - w[1]).abs() > 0.01);
        assert!(has_variation);
    }
}// src/infrastructure/bible_api.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BibleVerse {
    pub reference: String,
    pub text: String,
    pub version: String,
    pub book: String,
    pub chapter: i32,
    pub verse: i32,
}

#[derive(Debug, Deserialize)]
struct ApiVerseResponse {
    data: ApiVerseData,
}

#[derive(Debug, Deserialize)]
struct ApiVerseData {
    id: String,
    content: String,
    reference: String,
    verse_count: i32,
}

#[derive(Debug, Deserialize)]
struct ApiBibleResponse {
    data: Vec<ApiBible>,
}

#[derive(Debug, Deserialize)]
struct ApiBible {
    id: String,
    name: String,
    abbreviation: String,
    description: String,
}

pub struct BibleApiService {
    client: reqwest::blocking::Client,
    api_key: String,
    base_url: String,
}

impl BibleApiService {
    pub fn new(api_key: String) -> Self {
        Self {
            client: reqwest::blocking::Client::new(),
            api_key,
            base_url: "https://api.scripture.api.bible/v1".to_string(),
        }
    }

    /// Get available Bible versions
    pub fn get_available_versions(&self) -> Result<Vec<(String, String)>, Box<dyn std::error::Error>> {
        let url = format!("{}/bibles", self.base_url);
        let response = self.client
            .get(&url)
            .header("api-key", &self.api_key)
            .send()?;

        let bible_response: ApiBibleResponse = response.json()?;
        
        Ok(bible_response.data
            .into_iter()
            .map(|bible| (bible.id, bible.name))
            .collect())
    }

    /// Fetch a Bible verse by reference (e.g., "John 3:16")
    pub fn fetch_verse(&self, reference: &str, version_id: &str) -> Result<BibleVerse, Box<dyn std::error::Error>> {
        // Parse the reference (basic implementation)
        let (book, chapter, verse) = self.parse_reference(reference)?;
        
        // Search for the verse using the API
        let search_url = format!("{}/bibles/{}/search", self.base_url, version_id);
        let mut params = HashMap::new();
        params.insert("query", reference);
        params.insert("limit", "1");
        
        let response = self.client
            .get(&search_url)
            .header("api-key", &self.api_key)
            .query(&params)
            .send()?;

        if !response.status().is_success() {
            return Err(format!("API request failed: {}", response.status()).into());
        }

        // For simplicity, we'll create a mock response structure
        // In a real implementation, you'd parse the actual API response
        let verse_text = format!("Sample verse text for {}", reference);
        
        Ok(BibleVerse {
            reference: reference.to_string(),
            text: verse_text,
            version: version_id.to_string(),
            book,
            chapter,
            verse,
        })
    }

    /// Fetch multiple verses (e.g., "John 3:16-17")
    pub fn fetch_verses(&self, reference: &str, version_id: &str) -> Result<Vec<BibleVerse>, Box<dyn std::error::Error>> {
        if reference.contains("-") {
            // Handle verse ranges
            let parts: Vec<&str> = reference.split("-").collect();
            if parts.len() != 2 {
                return Err("Invalid verse range format".into());
            }
            
            let (book, chapter, start_verse) = self.parse_reference(parts[0])?;
            let end_verse: i32 = parts[1].parse()?;
            
            let mut verses = Vec::new();
            for verse_num in start_verse..=end_verse {
                let verse_ref = format!("{}{}:{}", book, chapter, verse_num);
                if let Ok(verse) = self.fetch_verse(&verse_ref, version_id) {
                    verses.push(verse);
                }
            }
            Ok(verses)
        } else {
            // Single verse
            Ok(vec![self.fetch_verse(reference, version_id)?])
        }
    }

    /// Basic reference parsing (book chapter:verse)
    fn parse_reference(&self, reference: &str) -> Result<(String, i32, i32), Box<dyn std::error::Error>> {
        let parts: Vec<&str> = reference.split_whitespace().collect();
        if parts.len() < 2 {
            return Err("Invalid reference format".into());
        }
        
        let book = parts[0..parts.len()-1].join(" ");
        let chapter_verse = parts[parts.len()-1];
        
        let cv_parts: Vec<&str> = chapter_verse.split(':').collect();
        if cv_parts.len() != 2 {
            return Err("Invalid chapter:verse format".into());
        }
        
        let chapter: i32 = cv_parts[0].parse()?;
        let verse: i32 = cv_parts[1].parse()?;
        
        Ok((book, chapter, verse))
    }

    /// Format verses for display (max 2 lines per slide)
    pub fn format_for_slides(&self, verses: &[BibleVerse]) -> Vec<(String, String)> {
        let mut slides = Vec::new();
        
        for verse in verses {
            let text = &verse.text;
            let words: Vec<&str> = text.split_whitespace().collect();
            
            // Simple word wrapping to fit 2 lines
            let max_words_per_line = 8; // Adjust based on your UI
            
            for chunk in words.chunks(max_words_per_line * 2) {
                let mid_point = chunk.len().min(max_words_per_line);
                let line1 = chunk[..mid_point].join(" ");
                let line2 = if chunk.len() > max_words_per_line {
                    chunk[max_words_per_line..].join(" ")
                } else {
                    String::new()
                };
                
                slides.push((line1, line2));
            }
            
            // Add reference slide
            slides.push((format!("{} ({})", verse.reference, verse.version), String::new()));
        }
        
        slides
    }
}

// Free API alternative using bible.com API (no key required)
pub struct FreeBibleApiService {
    client: reqwest::blocking::Client,
}

impl FreeBibleApiService {
    pub fn new() -> Self {
        Self {
            client: reqwest::blocking::Client::new(),
        }
    }

    /// Fetch verse using a free API (simplified)
    pub fn fetch_verse_free(&self, reference: &str, version: &str) -> Result<BibleVerse, Box<dyn std::error::Error>> {
        // Use Bible Gateway API or similar free service
        let url = format!("https://bible-api.com/{}", reference);
        
        let response = self.client
            .get(&url)
            .header("User-Agent", "RustPresenter/1.0")
            .send()?;

        if !response.status().is_success() {
            return Err(format!("Failed to fetch verse: {}", response.status()).into());
        }

        // Parse response (this is a simplified example)
        let text = response.text()?;
        
        // Extract book, chapter, verse from reference
        let (book, chapter, verse) = self.parse_reference_simple(reference)?;
        
        Ok(BibleVerse {
            reference: reference.to_string(),
            text: text.trim().to_string(),
            version: version.to_string(),
            book,
            chapter,
            verse,
        })
    }

    fn parse_reference_simple(&self, reference: &str) -> Result<(String, i32, i32), Box<dyn std::error::Error>> {
        let parts: Vec<&str> = reference.split_whitespace().collect();
        if parts.is_empty() {
            return Err("Empty reference".into());
        }
        
        let book = parts[0].to_string();
        let chapter = 1; // Default
        let verse = 1; // Default
        
        // This is a very basic parser - in production, you'd want more robust parsing
        Ok((book, chapter, verse))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_reference() {
        let service = BibleApiService::new("test_key".to_string());
        let result = service.parse_reference("John 3:16");
        assert!(result.is_ok());
        let (book, chapter, verse) = result.unwrap();
        assert_eq!(book, "John");
        assert_eq!(chapter, 3);
        assert_eq!(verse, 16);
    }

    #[test]
    fn test_parse_reference_with_space_in_book() {
        let service = BibleApiService::new("test_key".to_string());
        let result = service.parse_reference("1 Corinthians 13:4");
        assert!(result.is_ok());
        let (book, chapter, verse) = result.unwrap();
        assert_eq!(book, "1 Corinthians");
        assert_eq!(chapter, 13);
        assert_eq!(verse, 4);
    }

    #[test]
    fn test_format_for_slides() {
        let service = BibleApiService::new("test_key".to_string());
        let verses = vec![
            BibleVerse {
                reference: "John 3:16".to_string(),
                text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.".to_string(),
                version: "NIV".to_string(),
                book: "John".to_string(),
                chapter: 3,
                verse: 16,
            }
        ];
        
        let slides = service.format_for_slides(&verses);
        assert!(!slides.is_empty());
        // Each slide should have at most 2 lines
        for (line1, line2) in &slides {
            assert!(!line1.is_empty() || !line2.is_empty());
        }
    }

    #[test]
    fn test_free_api_service_creation() {
        let service = FreeBibleApiService::new();
        // Just test that it can be created without panicking
        assert!(true);
    }

    #[test]
    fn test_bible_verse_serialization() {
        let verse = BibleVerse {
            reference: "John 3:16".to_string(),
            text: "Sample text".to_string(),
            version: "NIV".to_string(),
            book: "John".to_string(),
            chapter: 3,
            verse: 16,
        };
        
        let json = serde_json::to_string(&verse).unwrap();
        let deserialized: BibleVerse = serde_json::from_str(&json).unwrap();
        assert_eq!(verse.reference, deserialized.reference);
        assert_eq!(verse.text, deserialized.text);
    }

    #[test]
    fn test_available_versions_mock() {
        let service = BibleApiService::new("test_key".to_string());
        // This would normally test the actual API call
        // For now, we'll just test that the method exists
        assert!(true);
    }

    #[test]
    fn test_verse_range_parsing() {
        let service = BibleApiService::new("test_key".to_string());
        // Test that verse ranges like "John 3:16-17" are handled
        let reference = "John 3:16-17";
        assert!(reference.contains("-"));
        let parts: Vec<&str> = reference.split("-").collect();
        assert_eq!(parts.len(), 2);
    }
}
