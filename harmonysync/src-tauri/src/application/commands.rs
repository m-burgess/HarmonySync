use tokio::io::AsyncBufReadExt;
use tauri::{command, AppHandle, Emitter};
use crate::domain::css_generator;
use std::fs;
use std::path::PathBuf;
use serde::{Serialize, Deserialize};
use tokio::process::Command;
use tokio::sync::Mutex;
use std::sync::Arc;
use once_cell::sync::Lazy;
use log::{info, error}; // Added

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub duration: u64,
    pub thumbnail_path: Option<String>,
    pub audio_codec: Option<String>,
}

// Global variable to hold the VLC child process handle
// This allows us to stop the previous VLC process if a new one is started
static VLC_PROCESS: Lazy<Arc<Mutex<Option<tokio::process::Child>>>> = 
    Lazy::new(|| Arc::new(Mutex::new(None)));

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

#[command]
pub async fn display_video_slide(app_handle: AppHandle, path: String, duration: u64) -> Result<(), String> {
    // Emit to audience window
    app_handle.emit_to("audience", "display-video-slide", &path)
        .map_err(|e| format!("Failed to emit display-video-slide to audience: {}", e))?;

    // Emit to confidence window for countdown
    app_handle.emit_to("confidence", "start-video-countdown", duration)
        .map_err(|e| format!("Failed to emit start-video-countdown to confidence: {}", e))?;

    Ok(())
}

#[command]
pub async fn get_video_metadata(_app_handle: AppHandle, path: String) -> Result<VideoMetadata, String> {
    // Get video duration
    let duration_output = Command::new("ffprobe")
        .arg("-v")
        .arg("error")
        .arg("-select_streams")
        .arg("v:0")
        .arg("-show_entries")
        .arg("stream=duration")
        .arg("-of")
        .arg("default=noprint_wrappers=1:nokey=1")
        .arg(&path)
        .output()
        .await
        .map_err(|e| format!("Failed to execute ffprobe for duration: {}", e))?;

    let duration_str = String::from_utf8_lossy(&duration_output.stdout);
    let duration = duration_str.trim().parse::<f64>()
        .map_err(|e| format!("Failed to parse duration: {}", e))?;

    // Get audio codec
    let audio_codec_output = Command::new("ffprobe")
        .arg("-v")
        .arg("error")
        .arg("-select_streams")
        .arg("a:0")
        .arg("-show_entries")
        .arg("stream=codec_name")
        .arg("-of")
        .arg("default=noprint_wrappers=1:nokey=1")
        .arg(&path)
        .output()
        .await
        .map_err(|e| format!("Failed to execute ffprobe for audio codec: {}", e))?;

    let audio_codec_str = String::from_utf8_lossy(&audio_codec_output.stdout);
    let audio_codec = if audio_codec_str.trim().is_empty() {
        None
    } else {
        Some(audio_codec_str.trim().to_string())
    };

    // For now, no thumbnail generation.
    Ok(VideoMetadata { duration: duration as u64, thumbnail_path: None, audio_codec })
}

#[command]
pub async fn transcode_video(input_path: String, output_path: String) -> Result<(), String> {
    let output = Command::new("ffmpeg")
        .arg("-i")
        .arg(&input_path)
        .arg("-c:v")
        .arg("libx264")
        .arg("-preset")
        .arg("medium")
        .arg("-crf")
        .arg("23")
        .arg("-c:a")
        .arg("aac")
        .arg("-b:a")
        .arg("128k")
        .arg(&output_path)
        .arg("-y") // Overwrite output file without asking
        .output()
        .await
        .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        Err(format!("ffmpeg transcoding failed: {0}\nStderr: {1}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        ))
    }
}

#[command]
pub async fn stream_video_with_vlc(_app_handle: AppHandle, video_path: String) -> Result<(), String> {
    // Stop any existing VLC process
    let mut vlc_process_guard = VLC_PROCESS.lock().await;
    if let Some(mut child) = vlc_process_guard.take() {
        info!("Stopping existing VLC process...");
        let _ = child.kill().await;
        let _ = child.wait().await;
        // Add a small delay to allow the port to be released
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    }

    let vlc_args = vec![
        &video_path,
        "--fullscreen", // Play in fullscreen
        "--no-video-title-show", // Don't show video title
        "--play-and-exit", // Play the video and exit VLC
    ];

    info!("Launching VLC with args: {:?}. Playing video directly.", vlc_args);

    let mut command = Command::new("vlc");
    command.args(&vlc_args);

    // Spawn VLC process
    let mut child = command
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn VLC process: {}", e))?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    tokio::spawn(async move {
        let reader = tokio::io::BufReader::new(stdout);
        let mut lines = reader.lines();
        while let Some(line) = lines.next_line().await.unwrap() {
            info!("[VLC stdout]: {:?}", line);
        }
    });

    tokio::spawn(async move {
        let reader = tokio::io::BufReader::new(stderr);
        let mut lines = reader.lines();
        while let Some(line) = lines.next_line().await.unwrap() {
            error!("[VLC stderr]: {:?}", line);
        }
    });

    // Await VLC process completion
    let status = child.wait().await
        .map_err(|e| format!("Failed to wait for VLC process: {}", e))?;

    info!("VLC process exited with status: {:?}", status);
    *vlc_process_guard = Some(child); // Store the child process even after it exits, for cleanup

    Ok(())
}
