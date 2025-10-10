
use std::fs;
use std::path::{Path, PathBuf};

pub fn copy_file(source_path: &Path, destination_dir: &Path) -> Result<PathBuf, String> {
    if !source_path.is_file() {
        return Err(format!("Source path is not a file: {}", source_path.display()));
    }

    if !destination_dir.is_dir() {
        fs::create_dir_all(destination_dir)
            .map_err(|e| format!("Failed to create destination directory {}: {}", destination_dir.display(), e))?;
    }

    let file_name = source_path.file_name()
        .ok_or_else(|| format!("Could not get file name from path: {}", source_path.display()))?;

    let destination_path = destination_dir.join(file_name);

    fs::copy(source_path, &destination_path)
        .map_err(|e| format!("Failed to copy file from {} to {}: {}", source_path.display(), destination_path.display(), e))?;

    Ok(destination_path)
}

pub fn create_dir_if_not_exists(path: &Path) -> Result<(), String> {
    if !path.exists() {
        fs::create_dir_all(path)
            .map_err(|e| format!("Failed to create directory {}: {}", path.display(), e))?;
    }
    Ok(())
}

pub fn copy_directory(from: &Path, to: &Path) -> Result<usize, String> {
    let mut count = 0;
    create_dir_if_not_exists(to)?;

    for entry in std::fs::read_dir(from).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let dest_path = to.join(path.file_name().unwrap());

        if path.is_dir() {
            count += copy_directory(&path, &dest_path)?;
        } else {
            fs::copy(&path, &dest_path).map_err(|e| e.to_string())?;
            count += 1;
        }
    }
    Ok(count)
}
