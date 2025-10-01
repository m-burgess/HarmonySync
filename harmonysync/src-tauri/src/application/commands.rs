use tauri::{command, AppHandle};
use crate::domain::css_generator;
use std::fs;
use std::path::PathBuf;

#[command]
pub async fn generate_background_css(_app: AppHandle, path: String) -> Result<String, String> {
    css_generator::generate_and_write_css(&path);

    let mut file_path = PathBuf::from(&path);
    file_path.push("background.css");

    match fs::read_to_string(&file_path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to read background.css: {}", e)),
    }
}
