use tauri::Manager;
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
use log::{info, error};
use ffmpeg_next as ffmpeg;
use std::path::Path;
use anyhow::Result;
use image::{ImageBuffer, Rgb};

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub duration: u64,
    pub thumbnail_path: Option<String>,
    pub audio_codec: Option<String>,
}

#[derive(Clone, serde::Serialize)]
struct ProgressPayload {
    file_name: String,
    progress: u64,
    message: String,
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
pub async fn get_video_metadata(app_handle: AppHandle, path: String) -> Result<VideoMetadata, String> {
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

    let thumbnail_path = generate_thumbnail(&path, &app_handle).await.ok();

    Ok(VideoMetadata { duration: duration as u64, thumbnail_path, audio_codec })
}

async fn generate_thumbnail(video_path: &str, app_handle: &AppHandle) -> Result<String> {
    info!("Generating thumbnail for: {}", video_path);
    ffmpeg::init()?;
    let mut ictx = ffmpeg::format::input(&Path::new(video_path))?;

    let input = ictx
        .streams()
        .best(ffmpeg::media::Type::Video)
        .ok_or(ffmpeg::Error::StreamNotFound)?;
    let video_stream_index = input.index();

    let mut decoder = ffmpeg::codec::context::Context::from_parameters(input.parameters())?
        .decoder()
        .video()?;

    let mut scaler = ffmpeg::software::scaling::context::Context::get(
        decoder.format(),
        decoder.width(),
        decoder.height(),
        ffmpeg::format::Pixel::RGB24,
        decoder.width(),
        decoder.height(),
        ffmpeg::software::scaling::flag::Flags::BILINEAR,
    )?;

    let mut frame_index = 0;

    for (stream, packet) in ictx.packets() {
        if stream.index() == video_stream_index {
            decoder.send_packet(&packet)?;
            let mut decoded = ffmpeg::util::frame::video::Video::empty();
            while decoder.receive_frame(&mut decoded).is_ok() {
                if frame_index == 100 { // Capture frame at around 3-4 seconds for a 30fps video
                    let mut rgb_frame = ffmpeg::util::frame::video::Video::empty();
                    scaler.run(&decoded, &mut rgb_frame)?;

                    let temp_dir = app_handle.path().app_cache_dir().unwrap();
                    let file_name = format!("{}.png", uuid::Uuid::new_v4());
                    let path = temp_dir.join(file_name);

                    let buffer = ImageBuffer::<Rgb<u8>, _>::from_raw(rgb_frame.width(), rgb_frame.height(), rgb_frame.data(0).to_vec()).unwrap();
                    buffer.save(&path)?;

                    info!("Thumbnail generated at: {}", path.to_str().unwrap());
                    return Ok(path.to_str().unwrap().to_string());
                }
                frame_index += 1;
            }
        }
    }

    error!("Failed to generate thumbnail for: {}", video_path);
    Err(anyhow::anyhow!("Failed to generate thumbnail"))
}


#[command]
pub async fn convert_to_ogg(app_handle: AppHandle, input_path: String) -> Result<String, String> {
    let window = app_handle.get_webview_window("main").ok_or_else(|| "Main window not found".to_string())?;
    info!("Converting {} to Ogg", input_path);
    let output_dir = app_handle.path().app_local_data_dir().map_err(|e| format!("Failed to get app local data directory: {}", e))?.join("harmonysync").join("cache");
    fs::create_dir_all(&output_dir).map_err(|e| format!("Failed to create output directory: {}", e))?;
    let file_name_os = Path::new(&input_path).file_name().ok_or_else(|| "Invalid input path".to_string())?;
    let file_name = file_name_os.to_str().ok_or_else(|| "Invalid file name".to_string())?;
    let output_path = output_dir.join(format!("{}.ogg", Path::new(file_name).file_stem().unwrap().to_str().unwrap()));

    let mut command = Command::new("ffmpeg");
    command
        .arg("-i")
        .arg(&input_path)
        .arg("-c:a")
        .arg("libvorbis")
        .arg("-q:a")
        .arg("4") // Quality scale for Vorbis, 0-10, 4 is a good balance
        .arg(&output_path)
        .arg("-y") // Overwrite output file without asking
        .arg("-progress") // Enable progress reporting
        .arg("pipe:2") // Send progress to stderr
        .stderr(std::process::Stdio::piped()); // Pipe stderr

    let mut child = command.spawn().map_err(|e| format!("Failed to spawn ffmpeg process: {}", e))?;

    let stderr = child.stderr.take().ok_or_else(|| "Failed to capture ffmpeg stderr".to_string())?;
    let reader = tokio::io::BufReader::new(stderr);
    let mut lines = reader.lines();

    // Get video duration for progress calculation
    let duration_output = Command::new("ffprobe")
        .arg("-v")
        .arg("error")
        .arg("-show_entries")
        .arg("format=duration")
        .arg("-of")
        .arg("default=noprint_wrappers=1:nokey=1")
        .arg(&input_path)
        .output()
        .await
        .map_err(|e| format!("Failed to execute ffprobe for duration: {}", e))?;

    let duration_str = String::from_utf8_lossy(&duration_output.stdout);
    let total_duration = duration_str.trim().parse::<f64>().unwrap_or(0.0);

    while let Some(line) = lines.next_line().await.map_err(|e| format!("Failed to read ffmpeg stderr: {}", e))? {
        if line.starts_with("out_time_ms=") {
            if let Some(time_ms_str) = line.split("=").nth(1) {
                if let Ok(time_ms) = time_ms_str.parse::<f64>() {
                    let current_time = time_ms / 1_000_000.0; // Convert microseconds to seconds

                    if total_duration > 0.0 {
                        let progress = (current_time / total_duration * 100.0) as u64;
                        let _ = window.emit("ogg-conversion-progress", ProgressPayload {
                            file_name: file_name.to_string(),
                            progress,
                            message: format!("Converting {}...", file_name),
                        });
                    }
                }
            }
        }
    }

    let output = child.wait_with_output().await.map_err(|e| format!("Failed to wait for ffmpeg process: {}", e))?;

    if output.status.success() {
        info!("Successfully converted {} to {}", input_path, output_path.to_str().unwrap());
        Ok(output_path.to_str().unwrap().to_string())
    } else {
        let stderr_output = String::from_utf8_lossy(&output.stderr);
        let stdout_output = String::from_utf8_lossy(&output.stdout);
        error!("Failed to convert {} to Ogg. Stderr: {}", input_path, stderr_output);
        Err(format!("ffmpeg Ogg conversion failed: {}\nStderr: {}",
            stdout_output,
            stderr_output
        ))
    }
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

#[command]
pub async fn stop_vlc_stream() -> Result<(), String> {
    let mut vlc_process_guard = VLC_PROCESS.lock().await;
    if let Some(mut child) = vlc_process_guard.take() {
        info!("Stopping VLC process...");
        let _ = child.kill().await;
        let _ = child.wait().await;
        info!("VLC process stopped.");
    } else {
        info!("No active VLC process to stop.");
    }
    Ok(())
}
