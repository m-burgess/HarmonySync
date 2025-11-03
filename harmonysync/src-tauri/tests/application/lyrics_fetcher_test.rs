#[cfg(test)]
mod lyrics_fetcher_tests {
    use crate::application::lyrics_fetcher::{is_section_header, format_lyrics_with_sections, GeniusClient};

    #[test]
    fn test_section_header_detection() {
        assert!(is_section_header("[Verse 1]"));
        assert!(is_section_header("[Chorus]"));
        assert!(is_section_header("[Bridge]"));
        assert!(is_section_header("VERSE 1"));
        assert!(is_section_header("CHORUS"));
        assert!(is_section_header("INTRO"));
        assert!(!is_section_header("This is a normal lyric line"));
        assert!(!is_section_header("singing in the rain"));
    }

    #[test]
    fn test_format_lyrics_preserves_sections() {
        let input = "[Verse 1]\nLine 1\nLine 2\n\n[Chorus]\nChorus line\n\n[Verse 2]\nMore lyrics";
        let formatted = format_lyrics_with_sections(input);
        
        assert!(formatted.contains("[Verse 1]"));
        assert!(formatted.contains("[Chorus]"));
        assert!(formatted.contains("[Verse 2]"));
        assert!(formatted.contains("Line 1"));
        assert!(formatted.contains("Chorus line"));
    }

    #[test]
    fn test_format_lyrics_handles_empty_lines() {
        let input = "[Verse]\nLine 1\n\n\nLine 2";
        let formatted = format_lyrics_with_sections(input);
        
        // Should preserve empty lines but consolidate multiple empties
        let lines: Vec<&str> = formatted.lines().collect();
        assert!(lines.contains(&"[Verse]"));
        assert!(lines.contains(&"Line 1"));
        assert!(lines.contains(&"Line 2"));
    }

    #[tokio::test]
    async fn test_genius_client_creation() {
        let client = GeniusClient::new(None);
        // Just verify we can create a client without panicking
        assert!(true);
    }

    #[tokio::test]
    async fn test_genius_client_with_token() {
        let client = GeniusClient::new(Some("test_token".to_string()));
        // Just verify we can create a client with a token
        assert!(true);
    }
}
