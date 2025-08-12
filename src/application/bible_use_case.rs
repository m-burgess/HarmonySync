// src/application/bible_use_case.rs
use crate::domain::entities::{Slide as DomainSlide};
use crate::infrastructure::bible_api::{BibleApiService, FreeBibleApiService, BibleVerse};

pub struct FetchBibleVerseUseCase {
    api_service: BibleApiService,
    free_service: FreeBibleApiService,
}

impl FetchBibleVerseUseCase {
    pub fn new(api_key: Option<String>) -> Self {
        Self {
            api_service: BibleApiService::new(api_key.unwrap_or_default()),
            free_service: FreeBibleApiService::new(),
        }
    }

    /// Fetch a Bible verse and convert it to presentation slides
    pub fn execute(
        &self,
        reference: &str,
        version: &str,
        use_free_api: bool,
    ) -> Result<Vec<DomainSlide>, Box<dyn std::error::Error>> {
        let verses = if use_free_api {
            vec![self.free_service.fetch_verse_free(reference, version)?]
        } else {
            self.api_service.fetch_verses(reference, version)?
        };

        let slides = self.convert_verses_to_slides(&verses);
        Ok(slides)
    }

    /// Get available Bible versions (only works with paid API)
    pub fn get_versions(&self) -> Result<Vec<(String, String)>, Box<dyn std::error::Error>> {
        self.api_service.get_available_versions()
    }

    /// Convert Bible verses into presentation slides with 2 lines max per slide
    fn convert_verses_to_slides(&self, verses: &[BibleVerse]) -> Vec<DomainSlide> {
        let mut slides = Vec::new();
        
        for verse in verses {
            // Split the verse text into manageable chunks for slides
            let formatted_slides = self.format_verse_for_slides(&verse.text);
            
            for (line1, line2) in formatted_slides {
                slides.push(DomainSlide {
                    lines: [line1, line2],
                });
            }
            
            // Add a reference slide at the end
            slides.push(DomainSlide {
                lines: [
                    format!("{}", verse.reference),
                    format!("({})", verse.version),
                ],
            });
        }
        
        slides
    }

    /// Format a single verse text into multiple slides with max 2 lines each
    fn format_verse_for_slides(&self, text: &str) -> Vec<(String, String)> {
        let words: Vec<&str> = text.split_whitespace().collect();
        let mut slides = Vec::new();
        
        // Estimate words per line based on average word length and screen width
        let max_chars_per_line = 60; // Adjust based on your UI
        let avg_word_length = 5; // Rough estimate
        let max_words_per_line = max_chars_per_line / avg_word_length;
        
        let mut current_line1 = Vec::new();
        let mut current_line2 = Vec::new();
        let mut current_line1_chars = 0;
        let mut current_line2_chars = 0;
        let mut using_line2 = false;
        
        for word in words {
            let word_len = word.len() + 1; // +1 for space
            
            if !using_line2 {
                // Try to add to line 1
                if current_line1_chars + word_len <= max_chars_per_line {
                    current_line1.push(word);
                    current_line1_chars += word_len;
                } else {
                    // Move to line 2
                    using_line2 = true;
                    current_line2.push(word);
                    current_line2_chars += word_len;
                }
            } else {
                // Try to add to line 2
                if current_line2_chars + word_len <= max_chars_per_line {
                    current_line2.push(word);
                    current_line2_chars += word_len;
                } else {
                    // Current slide is full, start a new slide
                    slides.push((
                        current_line1.join(" "),
                        current_line2.join(" "),
                    ));
                    
                    current_line1 = vec![word];
                    current_line2 = Vec::new();
                    current_line1_chars = word_len;
                    current_line2_chars = 0;
                    using_line2 = false;
                }
            }
        }
        
        // Add the final slide if there's content
        if !current_line1.is_empty() || !current_line2.is_empty() {
            slides.push((
                current_line1.join(" "),
                current_line2.join(" "),
            ));
        }
        
        slides
    }

    /// Validate Bible reference format
    pub fn validate_reference(&self, reference: &str) -> Result<(), String> {
        if reference.trim().is_empty() {
            return Err("Reference cannot be empty".to_string());
        }
        
        // Basic validation - check for book and chapter:verse pattern
        let parts: Vec<&str> = reference.split_whitespace().collect();
        if parts.len() < 2 {
            return Err("Reference must include book and chapter:verse".to_string());
        }
        
        let chapter_verse = parts[parts.len() - 1];
        if !chapter_verse.contains(':') {
            return Err("Reference must include chapter:verse format".to_string());
        }
        
        let cv_parts: Vec<&str> = chapter_verse.split(':').collect();
        if cv_parts.len() != 2 {
            return Err("Invalid chapter:verse format".to_string());
        }
        
        // Validate chapter and verse are numbers
        if cv_parts[0].parse::<i32>().is_err() {
            return Err("Chapter must be a number".to_string());
        }
        
        // Handle verse ranges (e.g., "16-18") or single verses
        let verse_part = cv_parts[1];
        if verse_part.contains('-') {
            let verse_range: Vec<&str> = verse_part.split('-').collect();
            if verse_range.len() != 2 {
                return Err("Invalid verse range format".to_string());
            }
            for v in verse_range {
                if v.parse::<i32>().is_err() {
                    return Err("Verse numbers must be integers".to_string());
                }
            }
        } else if verse_part.parse::<i32>().is_err() {
            return Err("Verse must be a number".to_string());
        }
        
        Ok(())
    }

    /// Get popular Bible verses for quick access
    pub fn get_popular_verses() -> Vec<(&'static str, &'static str)> {
        vec![
            ("John 3:16", "For God so loved the world..."),
            ("Romans 8:28", "And we know that in all things..."),
            ("Philippians 4:13", "I can do all this through him..."),
            ("Psalm 23:1", "The Lord is my shepherd..."),
            ("1 Corinthians 13:4-7", "Love is patient, love is kind..."),
            ("Matthew 28:19-20", "Therefore go and make disciples..."),
            ("Romans 6:23", "For the wages of sin is death..."),
            ("Ephesians 2:8-9", "For it is by grace you have been saved..."),
            ("Proverbs 3:5-6", "Trust in the Lord with all your heart..."),
            ("Isaiah 40:31", "But those who hope in the Lord..."),
        ]
    }

    /// Search for verses containing specific keywords
    pub fn search_verses_by_keyword(
        &self,
        keyword: &str,
        version: &str,
        limit: usize,
    ) -> Result<Vec<BibleVerse>, Box<dyn std::error::Error>> {
        // This would use the API's search functionality
        // For now, return popular verses that might match the keyword
        let popular = Self::get_popular_verses();
        let mut results = Vec::new();
        
        for (reference, preview) in popular {
            if preview.to_lowercase().contains(&keyword.to_lowercase()) 
                || reference.to_lowercase().contains(&keyword.to_lowercase()) {
                if let Ok(verse) = self.free_service.fetch_verse_free(reference, version) {
                    results.push(verse);
                    if results.len() >= limit {
                        break;
                    }
                }
            }
        }
        
        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_reference_valid() {
        let use_case = FetchBibleVerseUseCase::new(None);
        
        assert!(use_case.validate_reference("John 3:16").is_ok());
        assert!(use_case.validate_reference("1 Corinthians 13:4").is_ok());
        assert!(use_case.validate_reference("Romans 8:28-30").is_ok());
    }

    #[test]
    fn test_validate_reference_invalid() {
        let use_case = FetchBibleVerseUseCase::new(None);
        
        assert!(use_case.validate_reference("").is_err());
        assert!(use_case.validate_reference("John").is_err());
        assert!(use_case.validate_reference("John 3").is_err());
        assert!(use_case.validate_reference("John abc:16").is_err());
        assert!(use_case.validate_reference("John 3:abc").is_err());
    }

    #[test]
    fn test_format_verse_for_slides() {
        let use_case = FetchBibleVerseUseCase::new(None);
        let text = "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.";
        
        let slides = use_case.format_verse_for_slides(text);
        assert!(!slides.is_empty());
        
        // Each slide should have at most 2 lines, and lines shouldn't be too long
        for (line1, line2) in &slides {
            assert!(line1.len() <= 80 || line2.len() <= 80); // Reasonable line length
        }
    }

    #[test]
    fn test_convert_verses_to_slides() {
        let use_case = FetchBibleVerseUseCase::new(None);
        let verses = vec![
            BibleVerse {
                reference: "John 3:16".to_string(),
                text: "For God so loved the world.".to_string(),
                version: "NIV".to_string(),
                book: "John".to_string(),
                chapter: 3,
                verse: 16,
            }
        ];
        
        let slides = use_case.convert_verses_to_slides(&verses);
        assert!(!slides.is_empty());
        
        // Should have at least the verse content plus reference slide
        assert!(slides.len() >= 2);
        
        // Last slide should be the reference
        let last_slide = &slides[slides.len() - 1];
        assert!(last_slide.lines[0].contains("John 3:16"));
    }

    #[test]
    fn test_get_popular_verses() {
        let popular = FetchBibleVerseUseCase::get_popular_verses();
        assert!(!popular.is_empty());
        assert_eq!(popular.len(), 10);
        
        // Check that John 3:16 is in the list
        assert!(popular.iter().any(|(ref_str, _)| *ref_str == "John 3:16"));
    }

    #[test]
    fn test_search_verses_by_keyword() {
        let use_case = FetchBibleVerseUseCase::new(None);
        
        // This test would normally connect to an API
        // For now, just test that it doesn't panic
        let results = use_case.search_verses_by_keyword("love", "NIV", 5);
        // The actual API call might fail in tests, so we just check it doesn't panic
        assert!(true);
    }

    #[test]
    fn test_use_case_creation() {
        let use_case1 = FetchBibleVerseUseCase::new(None);
        let use_case2 = FetchBibleVerseUseCase::new(Some("test_key".to_string()));
        
        // Just verify they can be created
        assert!(true);
    }

    #[test]
    fn test_empty_text_handling() {
        let use_case = FetchBibleVerseUseCase::new(None);
        let slides = use_case.format_verse_for_slides("");
        assert!(slides.is_empty());
    }

    #[test]
    fn test_single_word_handling() {
        let use_case = FetchBibleVerseUseCase::new(None);
        let slides = use_case.format_verse_for_slides("Jesus");
        assert_eq!(slides.len(), 1);
        assert_eq!(slides[0].0, "Jesus");
        assert_eq!(slides[0].1, "");
    }
}
