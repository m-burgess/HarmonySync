use app_lib::application::file_manager;
use std::fs;
use std::path::Path;
use tempfile::TempDir;

#[cfg(test)]
mod file_manager_tests {
    use super::*;

    #[test]
    fn test_copy_file_success() {
        let temp_dir = TempDir::new().unwrap();
        let source_path = temp_dir.path().join("source.txt");
        let dest_dir = temp_dir.path().join("destination");

        // Create source file
        fs::write(&source_path, "test content").unwrap();

        let result = file_manager::copy_file(&source_path, &dest_dir);
        assert!(result.is_ok());

        let dest_path = result.unwrap();
        assert!(dest_path.exists());
        
        let content = fs::read_to_string(&dest_path).unwrap();
        assert_eq!(content, "test content");
    }

    #[test]
    fn test_copy_file_to_existing_directory() {
        let temp_dir = TempDir::new().unwrap();
        let source_path = temp_dir.path().join("source.txt");
        let dest_dir = temp_dir.path().join("destination");

        // Create source file and destination directory
        fs::write(&source_path, "test content").unwrap();
        fs::create_dir(&dest_dir).unwrap();

        let result = file_manager::copy_file(&source_path, &dest_dir);
        assert!(result.is_ok());

        let dest_path = result.unwrap();
        assert_eq!(dest_path, dest_dir.join("source.txt"));
    }

    #[test]
    fn test_copy_file_nonexistent_source() {
        let temp_dir = TempDir::new().unwrap();
        let source_path = temp_dir.path().join("nonexistent.txt");
        let dest_dir = temp_dir.path().join("destination");

        let result = file_manager::copy_file(&source_path, &dest_dir);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Source path is not a file"));
    }

    #[test]
    fn test_copy_file_preserves_filename() {
        let temp_dir = TempDir::new().unwrap();
        let source_path = temp_dir.path().join("my_file.txt");
        let dest_dir = temp_dir.path().join("destination");

        fs::write(&source_path, "content").unwrap();

        let result = file_manager::copy_file(&source_path, &dest_dir);
        let dest_path = result.unwrap();
        
        assert_eq!(dest_path.file_name().unwrap(), "my_file.txt");
    }

    #[test]
    fn test_create_dir_if_not_exists_new_directory() {
        let temp_dir = TempDir::new().unwrap();
        let new_dir = temp_dir.path().join("new_directory");

        assert!(!new_dir.exists());

        let result = file_manager::create_dir_if_not_exists(&new_dir);
        assert!(result.is_ok());
        assert!(new_dir.exists());
        assert!(new_dir.is_dir());
    }

    #[test]
    fn test_create_dir_if_not_exists_existing_directory() {
        let temp_dir = TempDir::new().unwrap();
        let existing_dir = temp_dir.path().join("existing");

        fs::create_dir(&existing_dir).unwrap();

        let result = file_manager::create_dir_if_not_exists(&existing_dir);
        assert!(result.is_ok());
        assert!(existing_dir.exists());
    }

    #[test]
    fn test_create_dir_if_not_exists_nested_directories() {
        let temp_dir = TempDir::new().unwrap();
        let nested_dir = temp_dir.path().join("level1").join("level2").join("level3");

        let result = file_manager::create_dir_if_not_exists(&nested_dir);
        assert!(result.is_ok());
        assert!(nested_dir.exists());
        assert!(nested_dir.is_dir());
    }

    #[test]
    fn test_copy_directory_success() {
        let temp_dir = TempDir::new().unwrap();
        let source_dir = temp_dir.path().join("source");
        let dest_dir = temp_dir.path().join("destination");

        // Create source directory with files
        fs::create_dir(&source_dir).unwrap();
        fs::write(source_dir.join("file1.txt"), "content1").unwrap();
        fs::write(source_dir.join("file2.txt"), "content2").unwrap();

        let result = file_manager::copy_directory(&source_dir, &dest_dir);
        assert!(result.is_ok());
        
        let count = result.unwrap();
        assert_eq!(count, 2, "Should have copied 2 files");

        assert!(dest_dir.join("file1.txt").exists());
        assert!(dest_dir.join("file2.txt").exists());
    }

    #[test]
    fn test_copy_directory_with_subdirectories() {
        let temp_dir = TempDir::new().unwrap();
        let source_dir = temp_dir.path().join("source");
        let dest_dir = temp_dir.path().join("destination");

        // Create source directory with subdirectories
        fs::create_dir(&source_dir).unwrap();
        fs::write(source_dir.join("file1.txt"), "content1").unwrap();
        
        let subdir = source_dir.join("subdir");
        fs::create_dir(&subdir).unwrap();
        fs::write(subdir.join("file2.txt"), "content2").unwrap();

        let result = file_manager::copy_directory(&source_dir, &dest_dir);
        assert!(result.is_ok());
        
        let count = result.unwrap();
        assert_eq!(count, 2, "Should have copied 2 files");

        assert!(dest_dir.join("file1.txt").exists());
        assert!(dest_dir.join("subdir").join("file2.txt").exists());
    }

    #[test]
    fn test_copy_directory_empty_directory() {
        let temp_dir = TempDir::new().unwrap();
        let source_dir = temp_dir.path().join("source");
        let dest_dir = temp_dir.path().join("destination");

        fs::create_dir(&source_dir).unwrap();

        let result = file_manager::copy_directory(&source_dir, &dest_dir);
        assert!(result.is_ok());
        
        let count = result.unwrap();
        assert_eq!(count, 0, "Should have copied 0 files");
        assert!(dest_dir.exists());
    }

    #[test]
    fn test_copy_directory_nonexistent_source() {
        let temp_dir = TempDir::new().unwrap();
        let source_dir = temp_dir.path().join("nonexistent");
        let dest_dir = temp_dir.path().join("destination");

        let result = file_manager::copy_directory(&source_dir, &dest_dir);
        assert!(result.is_err());
    }

    #[test]
    fn test_copy_directory_preserves_content() {
        let temp_dir = TempDir::new().unwrap();
        let source_dir = temp_dir.path().join("source");
        let dest_dir = temp_dir.path().join("destination");

        fs::create_dir(&source_dir).unwrap();
        fs::write(source_dir.join("test.txt"), "test content").unwrap();

        file_manager::copy_directory(&source_dir, &dest_dir).unwrap();

        let content = fs::read_to_string(dest_dir.join("test.txt")).unwrap();
        assert_eq!(content, "test content");
    }
}
