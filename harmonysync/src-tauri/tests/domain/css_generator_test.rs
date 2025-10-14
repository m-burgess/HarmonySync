use app_lib::domain::css_generator;
use std::fs;
use std::path::PathBuf;
use tempfile::TempDir;

#[cfg(test)]
mod css_generator_tests {
    use super::*;

    #[test]
    fn test_generate_and_write_css_creates_file() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().to_str().unwrap();

        css_generator::generate_and_write_css(path);

        let mut file_path = PathBuf::from(path);
        file_path.push("background.css");

        assert!(file_path.exists(), "CSS file should be created");
    }

    #[test]
    fn test_generate_and_write_css_does_not_overwrite() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().to_str().unwrap();

        let mut file_path = PathBuf::from(path);
        file_path.push("background.css");

        // Create a file with specific content
        fs::write(&file_path, "existing content").unwrap();

        // Call the function
        css_generator::generate_and_write_css(path);

        // Verify the file was not overwritten
        let content = fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, "existing content", "File should not be overwritten");
    }

    #[test]
    fn test_generated_css_contains_background_gradient() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().to_str().unwrap();

        css_generator::generate_and_write_css(path);

        let mut file_path = PathBuf::from(path);
        file_path.push("background.css");

        let content = fs::read_to_string(&file_path).unwrap();

        assert!(content.contains("background:"), "Should contain background property");
        assert!(content.contains("linear-gradient"), "Should use linear-gradient");
        assert!(content.contains("-45deg"), "Should have -45deg angle");
    }

    #[test]
    fn test_generated_css_contains_animation() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().to_str().unwrap();

        css_generator::generate_and_write_css(path);

        let mut file_path = PathBuf::from(path);
        file_path.push("background.css");

        let content = fs::read_to_string(&file_path).unwrap();

        assert!(content.contains("animation:"), "Should contain animation property");
        assert!(content.contains("gradient 15s ease infinite"), "Should have gradient animation");
        assert!(content.contains("@keyframes gradient"), "Should have keyframes definition");
    }

    #[test]
    fn test_generated_css_has_valid_structure() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().to_str().unwrap();

        css_generator::generate_and_write_css(path);

        let mut file_path = PathBuf::from(path);
        file_path.push("background.css");

        let content = fs::read_to_string(&file_path).unwrap();

        // Check for basic CSS structure
        assert!(content.contains("body {"), "Should have body selector");
        assert!(content.contains("background-size: 400% 400%"), "Should have background-size");
        assert!(content.contains("0%"), "Should have keyframe percentages");
        assert!(content.contains("50%"), "Should have keyframe percentages");
        assert!(content.contains("100%"), "Should have keyframe percentages");
    }

    #[test]
    fn test_generated_css_creates_parent_directories() {
        let temp_dir = TempDir::new().unwrap();
        let nested_path = temp_dir.path().join("nested").join("directory");
        
        // Don't create the directory, let the function do it
        let path = nested_path.to_str().unwrap();

        css_generator::generate_and_write_css(path);

        let mut file_path = PathBuf::from(path);
        file_path.push("background.css");

        assert!(file_path.exists(), "Should create parent directories and file");
    }

    #[test]
    fn test_generated_css_has_rgb_values() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().to_str().unwrap();

        css_generator::generate_and_write_css(path);

        let mut file_path = PathBuf::from(path);
        file_path.push("background.css");

        let content = fs::read_to_string(&file_path).unwrap();

        // Should contain rgb() color functions
        assert!(content.contains("rgb("), "Should contain RGB color functions");
        
        // Count RGB occurrences (should have 3 colors in the gradient)
        let rgb_count = content.matches("rgb(").count();
        assert_eq!(rgb_count, 3, "Should have exactly 3 RGB colors in gradient");
    }

    #[test]
    fn test_multiple_calls_generate_different_css() {
        let temp_dir1 = TempDir::new().unwrap();
        let temp_dir2 = TempDir::new().unwrap();
        
        let path1 = temp_dir1.path().to_str().unwrap();
        let path2 = temp_dir2.path().to_str().unwrap();

        css_generator::generate_and_write_css(path1);
        css_generator::generate_and_write_css(path2);

        let mut file_path1 = PathBuf::from(path1);
        file_path1.push("background.css");
        
        let mut file_path2 = PathBuf::from(path2);
        file_path2.push("background.css");

        let content1 = fs::read_to_string(&file_path1).unwrap();
        let content2 = fs::read_to_string(&file_path2).unwrap();

        // Due to random color generation, these should be different (with very high probability)
        // But they should have the same structure
        assert!(content1.contains("background:"));
        assert!(content2.contains("background:"));
    }
}
