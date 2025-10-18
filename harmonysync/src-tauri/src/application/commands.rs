use tauri::{command, AppHandle, Emitter, Manager};
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
use tokio::sync::oneshot; // Import oneshot
use tokio::io::AsyncBufReadExt;
use rand::Rng;

// Import the new http_server module
use super::http_server;
use super::audio_decoder;

// Global variable to hold the server shutdown sender
static HTTP_SERVER_SHUTDOWN_TX: Lazy<Arc<Mutex<Option<oneshot::Sender<()>>>>> = // Changed type
    Lazy::new(|| Arc::new(Mutex::new(None)));

// CSS Generator functions
fn generate_and_write_css(path: &str) {
    let mut file_path = PathBuf::from(path);
    file_path.push("background.css");

    if !file_path.exists() {
        let css_content = generate_css_content();
        write_css_file(&file_path, &css_content);
    }
}

fn generate_css_content() -> String {
    let mut rng = rand::thread_rng();
    let r1 = rng.gen_range(100..256);
    let g1 = rng.gen_range(100..256);
    let b1 = rng.gen_range(100..256);

    let r2 = rng.gen_range(100..256);
    let g2 = rng.gen_range(100..256);
    let b2 = rng.gen_range(100..256);

    let r3 = rng.gen_range(100..256);
    let g3 = rng.gen_range(100..256);
    let b3 = rng.gen_range(100..256);

    format!(
        "body {{\n    background: linear-gradient(-45deg, rgb({}, {}, {}), rgb({}, {}, {}), rgb({}, {}, {}));\n    background-size: 400% 400%;\n    animation: gradient 15s ease infinite;\n}}\n\n@keyframes gradient {{\n    0% {{\n        background-position: 0% 50%;\n    }}\n    50% {{\n        background-position: 100% 50%;\n    }}\n    100% {{\n        background-position: 0% 50%;\n    }}\n}}",
        r1, g1, b1, r2, g2, b2, r3, g3, b3
    )
}

fn write_css_file(file_path: &PathBuf, content: &str) {
    if let Some(parent_dir) = file_path.parent() {
        if !parent_dir.exists() {
            fs::create_dir_all(parent_dir).unwrap();
        }
    }
    fs::write(file_path, content).unwrap();
}

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

#[derive(Clone, serde::Serialize)]
struct VideoTranscodeProgressPayload {
    file_name: String,
    progress: u64,
    message: String,
}

#[command]
pub async fn generate_background_css(_app: AppHandle, path: String) -> Result<String, String> {
    generate_and_write_css(&path);

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

                    let temp_dir = app_handle.path().app_local_data_dir().unwrap().join("harmonysync").join("cache");
                    fs::create_dir_all(&temp_dir)?;
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


async fn convert_to_ogg_with_output_dir(app_handle: &AppHandle, input_path: &str, output_dir: &str) -> Result<String, String> {
    let window = app_handle.get_webview_window("main").ok_or_else(|| "Main window not found".to_string())?;
    info!("Converting {} to Ogg in directory {}", input_path, output_dir);
    
    let output_dir_path = Path::new(output_dir);
    fs::create_dir_all(&output_dir_path).map_err(|e| format!("Failed to create output directory: {}", e))?;
    
    let file_name_os = Path::new(input_path).file_name().ok_or_else(|| "Invalid input path".to_string())?;
    let file_name = file_name_os.to_str().ok_or_else(|| "Invalid file name".to_string())?;
    let output_path = output_dir_path.join(format!("{}.ogg", Path::new(file_name).file_stem().unwrap().to_str().unwrap()));

    let mut command = Command::new("ffmpeg");
    command
        .arg("-i")
        .arg(input_path)
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
        .arg(input_path)
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

// Helper function to convert multiple audio files to a single multi-channel MOGG file
async fn convert_to_individual_tracks(
    app_handle: &AppHandle, 
    audio_files: &[String],
    song_title: &str
) -> Result<Vec<(String, String)>, String> {
    let window = app_handle.get_webview_window("main").ok_or_else(|| "Main window not found".to_string())?;
    
    // Validate inputs
    if audio_files.is_empty() {
        return Err("No audio files provided for conversion".to_string());
    }
    
    info!("Converting {} audio files to individual streaming tracks", audio_files.len());
    
    let output_dir = app_handle.path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app local data directory: {}", e))?
        .join("harmonysync")
        .join("cache")
        .join(format!("{}_tracks", song_title));
    fs::create_dir_all(&output_dir).map_err(|e| format!("Failed to create output directory: {}", e))?;
    
    let mut track_files = Vec::new();
    
    // Convert each audio file to a separate optimized file for streaming
    for (i, audio_file) in audio_files.iter().enumerate() {
        // Extract track name from filename
        let track_name = Path::new(audio_file)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or(&format!("Track_{}", i))
            .to_string();
        
        let output_filename = format!("{:02}_{}.ogg", i, track_name);
        let output_path = output_dir.join(&output_filename);
        
        let mut command = Command::new("ffmpeg");
        command
            .arg("-i")
            .arg(audio_file)
            .arg("-ac")
            .arg("1")  // Convert to mono for consistent streaming
            .arg("-c:a")
            .arg("libvorbis")  // Use Vorbis for good compression and streaming
            .arg("-q:a")
            .arg("3")  // Good quality for streaming
            .arg("-ar")
            .arg("44100")  // Standard sample rate
            .arg(&output_path)
            .arg("-y")
            .stderr(std::process::Stdio::piped());
        
        info!("Converting {} to streaming track: {}", audio_file, output_path.display());
        
        let output = command.output().await.map_err(|e| format!("Failed to execute ffmpeg for file {}: {}", audio_file, e))?;
        
        if output.status.success() {
            info!("Successfully converted {} to streaming track", track_name);
            track_files.push((track_name, output_path.to_str().unwrap().to_string()));
        } else {
            let stderr_output = String::from_utf8_lossy(&output.stderr);
            error!("Failed to convert {}. Stderr: {}", audio_file, stderr_output);
            return Err(format!("ffmpeg conversion failed for {}: {}", audio_file, stderr_output));
        }
        
        // Update progress
        let progress = ((i + 1) as f64 / audio_files.len() as f64 * 100.0) as u64;
        let _ = window.emit("ogg-conversion-progress", ProgressPayload {
            file_name: song_title.to_string(),
            progress,
            message: format!("Creating streaming track {} of {}...", i + 1, audio_files.len()),
        });
    }
    
    info!("Successfully created {} streaming tracks", track_files.len());
    Ok(track_files)
}

#[command]
pub async fn convert_to_ogg(app_handle: AppHandle, input_path: String, output_dir: String) -> Result<String, String> {
    convert_to_ogg_with_output_dir(&app_handle, &input_path, &output_dir).await
}

#[command]
pub async fn transcode_video(app_handle: AppHandle, input_path: String) -> Result<String, String> {
    let window = app_handle.get_webview_window("main").ok_or_else(|| "Main window not found".to_string())?;
    info!("Transcoding {} for YouTube compatibility", input_path);

    let output_dir = app_handle.path().app_local_data_dir().map_err(|e| format!("Failed to get app local data directory: {}", e))?.join("harmonysync").join("cache");
    fs::create_dir_all(&output_dir).map_err(|e| format!("Failed to create output directory: {}", e))?;
    let file_name_os = Path::new(&input_path).file_name().ok_or_else(|| "Invalid input path".to_string())?;
    let file_name = file_name_os.to_str().ok_or_else(|| "Invalid file name".to_string())?;
    let output_path = output_dir.join(format!("{}_youtube.mp4", Path::new(file_name).file_stem().unwrap().to_str().unwrap()));

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

    let mut command = Command::new("ffmpeg");
    command
        .arg("-i")
        .arg(&input_path)
        // Video Codec: H.264
        .arg("-c:v").arg("libx264")
        .arg("-preset").arg("medium") // or fast, slow, etc.
        .arg("-crf").arg("23") // Constant Rate Factor, 18-28 is good, lower is higher quality
        .arg("-pix_fmt").arg("yuv420p") // Pixel format for broad compatibility
        .arg("-profile:v").arg("high")
        .arg("-level:v").arg("4.0")
        // Audio Codec: AAC
        .arg("-c:a").arg("aac")
        .arg("-b:a").arg("128k") // Audio bitrate
        .arg("-movflags").arg("faststart") // Optimize for streaming
        .arg(&output_path)
        .arg("-y") // Overwrite output file without asking
        .arg("-progress").arg("pipe:2") // Enable progress reporting
        .stderr(std::process::Stdio::piped()); // Pipe stderr

    let mut child = command.spawn().map_err(|e| format!("Failed to spawn ffmpeg process: {}", e))?;

    let stderr = child.stderr.take().ok_or_else(|| "Failed to capture ffmpeg stderr".to_string())?;
    let reader = tokio::io::BufReader::new(stderr);
    let mut lines = reader.lines();

    while let Some(line) = lines.next_line().await.map_err(|e| format!("Failed to read ffmpeg stderr: {}", e))? {
        if line.starts_with("out_time_ms=") {
            if let Some(time_ms_str) = line.split("=").nth(1) {
                if let Ok(time_ms) = time_ms_str.parse::<f64>() {
                    let current_time = time_ms / 1_000_000.0; // Convert microseconds to seconds

                    if total_duration > 0.0 {
                        let progress = (current_time / total_duration * 100.0) as u64;
                        let _ = window.emit("video-transcode-progress", VideoTranscodeProgressPayload {
                            file_name: file_name.to_string(),
                            progress,
                            message: format!("Transcoding {}...", file_name),
                        });
                    }
                }
            }
        }
    }

    let output = child.wait_with_output().await.map_err(|e| format!("Failed to wait for ffmpeg process: {}", e))?;

    if output.status.success() {
        info!("Successfully transcoded {} to {}", input_path, output_path.to_str().unwrap());
        Ok(output_path.to_str().unwrap().to_string())
    } else {
        let stderr_output = String::from_utf8_lossy(&output.stderr);
        let stdout_output = String::from_utf8_lossy(&output.stdout);
        error!("Failed to transcode {}. Stderr: {}", input_path, stderr_output);
        Err(format!("ffmpeg transcoding failed: {}\nStderr: {}",
            stdout_output,
            stderr_output
        ))
    }
}

#[command]
pub async fn start_http_server(app_handle: AppHandle, port: u16) -> Result<String, String> {
    let mut shutdown_tx_guard = HTTP_SERVER_SHUTDOWN_TX.lock().await;

    // If a server is already running, stop it first
    if let Some(tx) = shutdown_tx_guard.take() {
        http_server::stop_server(tx).await;
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await; // Give it time to shut down
    }

    let serve_dir = app_handle.path().app_local_data_dir()
        .map_err(|e| format!("Failed to get app local data directory: {}", e))?
        .join("harmonysync")
        .join("cache");

    let server_result = http_server::start_server(port, serve_dir.clone()).await;

    match server_result {
        Ok((url, tx)) => {
            info!("HTTP server started successfully at {}", url);
            *shutdown_tx_guard = Some(tx);
            Ok(url)
        },
        Err(e) => {
            error!("Failed to start HTTP server: {}", e);
            *shutdown_tx_guard = None;
            Err(e)
        }
    }
}

#[command]
pub async fn stop_http_server() -> Result<(), String> {
    let mut shutdown_tx_guard = HTTP_SERVER_SHUTDOWN_TX.lock().await;
    if let Some(tx) = shutdown_tx_guard.take() {
        http_server::stop_server(tx).await;
        info!("HTTP server stopped.");
        Ok(())
    } else {
        info!("No HTTP server was running to stop.");
        Ok(())
    }
}

/*
#[command]
pub fn add_song(
    title: String,
    lyrics: String,
    repository: State<'_, SqliteRepository>,
) -> Result<Song, String> {
    let new_song = Song {
        id: None,
        title,
        lyrics: Some(lyrics),
        mogg_file_path: None,
    };
    SongRepository::insert(repository.inner(), &new_song).map_err(|e| e.to_string())
}

#[command]
pub fn update_song(
    song: Song,
    repository: State<'_, SqliteRepository>,
) -> Result<(), String> {
    SongRepository::update(repository.inner(), &song).map_err(|e| e.to_string())
}

#[command]
pub fn delete_song(
    id: i64,
    repository: State<'_, SqliteRepository>,
) -> Result<(), String> {
    SongRepository::delete(repository.inner(), id).map_err(|e| e.to_string())
}

#[command]
pub fn insert_track(
    song_id: i64,
    file_path: String,
    track_name: Option<String>,
    repository: State<'_, SqliteRepository>,
) -> Result<Track, String> {
    let new_track = Track {
        id: None,
        song_id,
        file_path,
        track_name,
    };
    TrackRepository::insert(repository.inner(), &new_track).map_err(|e| e.to_string())
}

#[command]
pub fn get_all_tracks_for_song(
    song_id: i64,
    repository: State<'_, SqliteRepository>,
) -> Result<Vec<Track>, String> {
    TrackRepository::get_all_for_song(repository.inner(), song_id).map_err(|e| e.to_string())
}

#[command]
pub fn update_track(
    track: Track,
    repository: State<'_, SqliteRepository>,
) -> Result<(), String> {
    TrackRepository::update(repository.inner(), &track).map_err(|e| e.to_string())
}

#[command]
pub fn delete_track(
    id: i64,
    repository: State<'_, SqliteRepository>,
) -> Result<(), String> {
    TrackRepository::delete(repository.inner(), id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_setting(
    key: String,
    repository: State<'_, SqliteRepository>,
) -> Result<Option<Setting>, String> {
    SettingRepository::get(repository.inner(), &key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_setting(
    key: String,
    value: String,
    repository: State<'_, SqliteRepository>,
) -> Result<(), String> {
    let setting = Setting { key, value };
    SettingRepository::set(repository.inner(), &setting).map_err(|e| e.to_string())
}

#[command]
pub fn get_all_macros(
    repository: State<'_, SqliteRepository>,
) -> Result<Vec<Macro>, String> {
    MacroRepository::get_all(repository.inner()).map_err(|e| e.to_string())
}

#[command]
pub fn insert_macro(
    name: String,
    action: String,
    repository: State<'_, SqliteRepository>,
) -> Result<Macro, String> {
    let new_macro = Macro {
        id: None,
        name,
        action,
    };
    MacroRepository::insert(repository.inner(), &new_macro).map_err(|e| e.to_string())
}

#[command]
pub fn update_macro(
    mac: Macro,
    repository: State<'_, SqliteRepository>,
) -> Result<(), String> {
    MacroRepository::update(repository.inner(), &mac).map_err(|e| e.to_string())
}

#[command]
pub fn delete_macro(
    id: i64,
    repository: State<'_, SqliteRepository>,
) -> Result<(), String> {
    MacroRepository::delete(repository.inner(), id).map_err(|e| e.to_string())
}

#[command]
pub fn get_macros_for_slide(
    slide_id: String,
    repository: State<'_, SqliteRepository>,
) -> Result<Vec<Macro>, String> {
    MacroRepository::get_for_slide(repository.inner(), &slide_id).map_err(|e| e.to_string())
}

#[command]
pub fn add_macro_to_slide(
    slide_id: String,
    macro_id: i64,
    repository: State<'_, SqliteRepository>,
) -> Result<(), String> {
    MacroRepository::add_to_slide(repository.inner(), &slide_id, macro_id).map_err(|e| e.to_string())
}

#[command]
pub fn remove_macro_from_slide(
    slide_id: String,
    macro_id: i64,
    repository: State<'_, SqliteRepository>,
) -> Result<(), String> {
    MacroRepository::remove_from_slide(repository.inner(), &slide_id, macro_id).map_err(|e| e.to_string())
}

#[command]
pub fn insert_scheduled_event(
    event: ScheduleEvent,
    repository: State<'_, SqliteRepository>,
) -> Result<ScheduleEvent, String> {
    ScheduleRepository::insert(repository.inner(), &event).map_err(|e| e.to_string())
}

#[command]
pub fn update_scheduled_event(
    event: ScheduleEvent,
    repository: State<'_, SqliteRepository>,
) -> Result<(), String> {
    ScheduleRepository::update(repository.inner(), &event).map_err(|e| e.to_string())
}


#[command]
pub async fn import_song_folder(
    app_handle: AppHandle,
    folder_path: String,
    repository: State<'_, SqliteRepository>,
) -> Result<(), String> {
    let folder_path_p = Path::new(&folder_path);

    // 1. Get Song Title from folder name
    let title = folder_path_p
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("Unknown Title")
        .to_string();

    // Check for duplicate song title and handle replacement
    let existing_songs = SongRepository::get_all(repository.inner()).map_err(|e| e.to_string())?;
    if let Some(existing_song) = existing_songs.iter().find(|s| s.title == title) {
        info!("Found existing song '{}', deleting and replacing with new version", title);
        
        // Delete existing song and its tracks
        if let Some(song_id) = existing_song.id {
            // First delete all tracks associated with the song
            let existing_tracks = TrackRepository::get_all_for_song(repository.inner(), song_id).map_err(|e| e.to_string())?;
            for track in existing_tracks {
                if let Some(track_id) = track.id {
                    TrackRepository::delete(repository.inner(), track_id).map_err(|e| e.to_string())?;
                }
            }
            
            // Delete the song itself
            SongRepository::delete(repository.inner(), song_id).map_err(|e| e.to_string())?;
            info!("Successfully deleted existing song and tracks for '{}'", title);
        }
    }

    // 2. Read Lyrics
    let lyrics_path = folder_path_p.join("lyrics.txt");
    let lyrics = fs::read_to_string(lyrics_path).map_err(|e| format!("Failed to read lyrics.txt: {}", e))?;

    // 3. Find audio files
    let mut audio_files = Vec::new();
    let supported_extensions = ["wav", "mp3", "aiff", "flac", "m4a"];
    for entry in fs::read_dir(folder_path_p).map_err(|e| format!("Failed to read folder: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();
        if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
            if supported_extensions.contains(&ext.to_lowercase().as_str()) {
                if let Some(path_str) = path.to_str() {
                    audio_files.push(path_str.to_string());
                }
            }
        }
    }

    if audio_files.is_empty() {
        return Err("No supported audio files found in the folder.".to_string());
    }

    // Check for reasonable number of tracks (Web Audio API supports up to 32 channels comfortably)
    if audio_files.len() > 32 {
        return Err(format!("Too many audio files ({}). Maximum supported is 32 tracks.", audio_files.len()));
    }

    // Sort audio files to ensure consistent track ordering
    audio_files.sort();

    // 4. Create song library folder
    let song_library_dir = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app local data dir: {}", e))?
        .join("harmonysync")
        .join("song_library");
    let specific_song_dir = song_library_dir.join(&title);
    fs::create_dir_all(&specific_song_dir)
        .map_err(|e| format!("Failed to create song library directory: {}", e))?;

    // 5. Convert all audio files to individual track files for streaming
    let track_files = convert_to_individual_tracks(&app_handle, &audio_files, &title).await?;
    
    // 6. Copy track files to the song library folder and collect their final paths
    let mut final_track_paths = Vec::new();
    for (track_name, temp_path) in &track_files {
        let temp_path_buf = Path::new(temp_path);
        let filename = temp_path_buf.file_name()
            .ok_or_else(|| format!("Track file path has no filename: {}", temp_path))?;
        let final_path = specific_song_dir.join(filename);
        fs::copy(temp_path, &final_path)
            .map_err(|e| format!("Failed to copy track file {}: {}", track_name, e))?;
        final_track_paths.push((track_name.clone(), final_path.to_str().unwrap().to_string()));
    }

    // 7. Store track names from the converted files
    let track_names: Vec<String> = track_files.iter().map(|(name, _)| name.clone()).collect();

    // 8. Add to database (no mogg_file_path since we have individual tracks)
    let new_song = Song {
        id: None,
        title: title.clone(),
        lyrics: Some(lyrics),
        mogg_file_path: None, // Individual tracks, not a single file
    };
    let inserted_song = SongRepository::insert(repository.inner(), &new_song).map_err(|e| e.to_string())?;
    let song_id = inserted_song.id.ok_or("Inserted song did not return an ID")?;

    // 9. Store track metadata in the database - each track has its own file path for streaming
    for (track_name, file_path) in &final_track_paths {
        let new_track = Track {
            id: None,
            song_id,
            file_path: file_path.clone(), // Each track has its own file for streaming
            track_name: Some(track_name.clone()), // No index needed since each has its own file
        };
        TrackRepository::insert(repository.inner(), &new_track).map_err(|e| e.to_string())?;
    }

    info!("Successfully imported song: {}", title);
    if let Err(e) = app_handle.emit("song-imported", ()) {
        eprintln!("Failed to emit song-imported event: {}", e);
    }
    Ok(())
}

#[command]
pub fn search_songs(
    search_term: String,
    repository: State<'_, SqliteRepository>,
) -> Result<Vec<SongSearchResult>, String> {
    let all_songs = SongRepository::get_all(repository.inner()).map_err(|e| e.to_string())?;
    let search_pattern = search_term.to_lowercase();

    let results: Vec<SongSearchResult> = all_songs.into_iter()
        .filter(|song| song.title.to_lowercase().contains(&search_pattern))
        .map(|song| SongSearchResult {
            id: song.id.unwrap_or_default(), // Assuming id is always present for existing songs
            title: song.title,
        })
        .collect();
    Ok(results)
}

#[command]
pub fn search_presentations(
    search_term: String,
    repository: State<'_, SqliteRepository>,
) -> Result<Vec<PresentationSearchResult>, String> {
    let all_presentations = PresentationRepository::get_all(repository.inner()).map_err(|e| e.to_string())?;
    let search_pattern = search_term.to_lowercase();

    let results: Vec<PresentationSearchResult> = all_presentations.into_iter()
        .filter(|presentation| presentation.name.to_lowercase().contains(&search_pattern))
        .map(|presentation| PresentationSearchResult {
            id: presentation.id.unwrap_or_default(),
            name: presentation.name,
            path: presentation.path,
        })
        .collect();
    Ok(results)
}





#[tauri::command]
pub fn import_presentation_folder(app_handle: tauri::AppHandle, source_folder_path: String, category: String, repository: tauri::State<'_, SqliteRepository>) -> Result<String, String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let presentation_library_root = app_dir.join("presentation_library");

    let category_folder = match category.as_str() {
        "song" => presentation_library_root.join("songs"),
        "presentation" => presentation_library_root.join("presentations"),
        _ => return Err(format!("Invalid category: {}. Must be 'song' or 'presentation'.", category)),
    };

    file_manager::create_dir_if_not_exists(&category_folder)?;

    let source_path = PathBuf::from(source_folder_path);

    if !source_path.is_dir() {
        return Err(format!("Source path is not a directory: {}", source_path.display()));
    }

    let presentation_name = source_path.file_name()
        .and_then(|s| s.to_str())
        .ok_or_else(|| "Could not get presentation name from source folder path.".to_string())?;

    // Check if a presentation with this name already exists
    if PresentationRepository::get_by_name(repository.inner(), presentation_name).map_err(|e| e.to_string())?.is_some() {
        return Err(format!("A presentation with the name '{}' already exists.", presentation_name));
    }

    let destination_presentation_path = category_folder.join(presentation_name);
    file_manager::create_dir_if_not_exists(&destination_presentation_path)?;

    let imported_files_count = file_manager::copy_directory(&source_path, &destination_presentation_path)?;

    // Create Presentation record in the database
    let new_presentation = Presentation {
        id: None,
        name: presentation_name.to_string(),
        path: destination_presentation_path.to_str().ok_or("Failed to convert path to string")?.to_string(),
        category: category.clone(),
    };

    let inserted_presentation = PresentationRepository::insert(repository.inner(), &new_presentation).map_err(|e| e.to_string())?;
    let presentation_id = inserted_presentation.id.ok_or("Inserted presentation did not return an ID")?;

    // Parse youtube.txt if it exists
    let youtube_txt_path = source_path.join("youtube.txt");
    if youtube_txt_path.is_file() {
        let content = std::fs::read_to_string(&youtube_txt_path)
            .map_err(|e| format!("Failed to read youtube.txt: {}", e))?;

        for line in content.lines() {
            let trimmed_line = line.trim();
            if !trimmed_line.is_empty() {
                // Basic validation for YouTube URL (can be improved)
                if trimmed_line.contains("youtube.com/") || trimmed_line.contains("youtu.be/") {
                    let new_link = YouTubeLink {
                        id: None,
                        presentation_id,
                        url: trimmed_line.to_string(),
                    };
                    YouTubeLinkRepository::insert(repository.inner(), &new_link).map_err(|e| e.to_string())?;
                } else {
                    eprintln!("Skipping invalid YouTube URL in youtube.txt: {}", trimmed_line);
                }
            }
        }
    }

    // Emit the presentation-imported event
    if let Err(e) = app_handle.emit("presentation-imported", ()) {
        eprintln!("Failed to emit presentation-imported event: {}", e);
    }

    Ok(format!("Successfully imported {} files for presentation '{}' into the '{}' category.", imported_files_count, presentation_name, category))
}

#[tauri::command]
pub fn get_all_songs(repository: tauri::State<'_, SqliteRepository>) -> Result<Vec<Song>, String> {
    SongRepository::get_all(repository.inner()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_song_details(
    song_id: i64,
    repository: State<'_, SqliteRepository>,
) -> Result<SongDetails, String> {
    let song = SongRepository::get_by_id(repository.inner(), song_id).map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Song with ID {} not found", song_id))?;
    let tracks = TrackRepository::get_all_for_song(repository.inner(), song_id).map_err(|e| e.to_string())?;
    Ok(SongDetails {
        id: song.id.unwrap_or_default(),
        title: song.title,
        lyrics: Some(song.lyrics.unwrap_or_default()),
        tracks,
    })
}

#[tauri::command]
pub fn get_presentation_details(
    presentation_id: i64,
    repository: State<'_, SqliteRepository>,
) -> Result<Presentation, String> {
    let presentation = PresentationRepository::get_by_id(repository.inner(), presentation_id).map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Presentation with ID {} not found", presentation_id))?;
    Ok(presentation)
}

#[tauri::command]
pub fn get_all_presentations(
    repository: State<'_, SqliteRepository>,
) -> Result<Vec<Presentation>, String> {
    PresentationRepository::get_all(repository.inner()).map_err(|e| e.to_string())
}
*/

// ===== Audio Decoding Commands =====

/// Decode an audio file and return the decoded samples
#[tauri::command]
pub async fn decode_audio_file(path: String) -> Result<audio_decoder::DecodedAudio, String> {
    // Run decoding in a blocking task since Symphonia is CPU-intensive
    tokio::task::spawn_blocking(move || {
        audio_decoder::decode_audio_file(&path)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Get audio from cache or decode it if not cached
#[tauri::command]
pub async fn get_or_decode_audio(path: String) -> Result<audio_decoder::DecodedAudio, String> {
    let start_time = std::time::Instant::now();
    
    let result = tokio::task::spawn_blocking(move || -> Result<audio_decoder::DecodedAudio, String> {
        let arc_decoded = audio_decoder::get_or_decode_audio(&path)?;
        // Clone the Arc's inner data to return
        let clone_start = std::time::Instant::now();
        let decoded = (*arc_decoded).clone();
        info!("[Tauri] Clone took {:.2}ms", clone_start.elapsed().as_secs_f64() * 1000.0);
        Ok(decoded)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))??;
    
    info!("[Tauri] Total command time: {:.2}ms", start_time.elapsed().as_secs_f64() * 1000.0);
    Ok(result)
}

/// Get audio metadata only (fast, small transfer)
#[tauri::command]
pub async fn get_audio_metadata(path: String) -> Result<audio_decoder::AudioMetadata, String> {
    tokio::task::spawn_blocking(move || {
        audio_decoder::get_audio_metadata(&path)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Get audio samples as binary data (fast binary transfer)
#[tauri::command]
pub async fn get_audio_samples_binary(path: String) -> Result<Vec<u8>, String> {
    let start_time = std::time::Instant::now();
    
    let result = tokio::task::spawn_blocking(move || -> Result<Vec<u8>, String> {
        audio_decoder::get_audio_samples_binary(&path)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))??;
    
    info!("[Tauri] Binary transfer time: {:.2}ms, {} bytes", 
          start_time.elapsed().as_secs_f64() * 1000.0,
          result.len());
    
    Ok(result)
}

/// Clear the audio cache
#[tauri::command]
pub fn clear_audio_cache() {
    audio_decoder::clear_audio_cache();
}

/// Remove a specific file from the audio cache
#[tauri::command]
pub fn remove_from_audio_cache(path: String) {
    audio_decoder::remove_from_cache(&path);
}

/// Get audio cache statistics
#[tauri::command]
pub fn get_audio_cache_stats() -> audio_decoder::AudioCacheStats {
    audio_decoder::get_cache_stats()
}
