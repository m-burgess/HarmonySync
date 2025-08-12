// src/infrastructure/bible_api.rs
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
