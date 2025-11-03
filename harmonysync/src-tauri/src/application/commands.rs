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
use super::performance;
use super::lyrics_fetcher;

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

#[command]
pub async fn execute_macro(app_handle: AppHandle, macro_id: String, macro_action: String, midi_note: Option<u8>) -> Result<(), String> {
    match macro_action.as_str() {
        "start_preservice_music" => {
            app_handle.emit_to("main", "start-preservice-music", ())
                .map_err(|e| format!("Failed to emit start-preservice-music event: {}", e))?;
            Ok(())
        },
        "stop_preservice_music" => {
            app_handle.emit_to("main", "stop-preservice-music", ())
                .map_err(|e| format!("Failed to emit stop-preservice-music event: {}", e))?;
            Ok(())
        },
        "send_midi_note" => {
            if let Some(note) = midi_note {
                #[derive(Clone, serde::Serialize)]
                struct MidiNotePayload {
                    note: u8,
                    velocity: u8,
                }
                
                app_handle.emit_to("main", "send-midi-note", MidiNotePayload {
                    note,
                    velocity: 127,
                })
                .map_err(|e| format!("Failed to emit send-midi-note event: {}", e))?;
                Ok(())
            } else {
                Err("MIDI note value is required for send_midi_note action".to_string())
            }
        },
        _ => Err(format!("Unknown macro action: {}", macro_action))
    }
}

#[command]
pub async fn start_audio_service() -> Result<String, String> {
    info!("Starting Node.js audio service...");
    
    // First check if the service is already running
    match check_audio_service_status().await {
        Ok(true) => {
            info!("Audio service is already running");
            return Ok("Audio service is already running".to_string());
        }
        Ok(false) => {
            info!("Audio service is not running, starting new instance...");
        }
        Err(e) => {
            info!("Could not check service status ({}), attempting to start...", e);
        }
    }
    
    // In development, use the project directory structure
    // In production, we'll need to adjust this path
    let audio_service_dir = if cfg!(debug_assertions) {
        // Development mode: go from src-tauri to project root and then to audio service
        let manifest_dir = std::env::var("CARGO_MANIFEST_DIR")
            .map_err(|_| "Failed to get manifest directory")?;
        
        info!("Manifest directory: {}", manifest_dir);
        
        // Navigate from harmonysync/src-tauri -> harmonysync -> RustPresenter -> harmonysync-audio-service
        let manifest_path = std::path::PathBuf::from(manifest_dir);
        let harmonysync_dir = manifest_path
            .parent()  // from src-tauri to harmonysync
            .ok_or("Failed to get harmonysync directory")?;
        let project_root = harmonysync_dir
            .parent()  // from harmonysync to RustPresenter
            .ok_or("Failed to get project root")?;
            
        info!("Project root: {:?}", project_root);
        
        project_root.join("harmonysync-audio-service")
    } else {
        // Production mode: look relative to executable
        let exe_path = std::env::current_exe()
            .map_err(|e| format!("Failed to get executable path: {}", e))?;
        
        let exe_dir = exe_path.parent()
            .ok_or("Failed to get executable directory")?;
        
        exe_dir.join("harmonysync-audio-service")
    };
    
    info!("Looking for audio service at: {:?}", audio_service_dir);
    
    if !audio_service_dir.exists() {
        return Err(format!("Audio service directory not found: {:?}", audio_service_dir));
    }
    
    info!("Audio service directory: {:?}", audio_service_dir);
    
    // Check if Node.js is available
    let node_check = Command::new("node")
        .arg("--version")
        .output()
        .await;
    
    if node_check.is_err() {
        return Err("Node.js is not installed or not in PATH".to_string());
    }
    
    // Check if the server.js file exists
    let server_js_path = audio_service_dir.join("server.js");
    if !server_js_path.exists() {
        return Err(format!("server.js not found at: {:?}", server_js_path));
    }
    
    // Start the audio service
    let mut child = Command::new("node")
        .arg("server.js")
        .current_dir(&audio_service_dir)
        .spawn()
        .map_err(|e| format!("Failed to start audio service: {}", e))?;
    
    // Give it a moment to start
    tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;
    
    // Check if the process is still running
    match child.try_wait() {
        Ok(Some(status)) => {
            // Process exited, check if it was due to port conflict
            if status.code() == Some(1) {
                info!("Audio service failed to start, likely due to port conflict. Attempting cleanup...");
                
                // Try to kill any existing audio service processes
                #[cfg(unix)]
                {
                    let _ = Command::new("pkill")
                        .args(&["-f", "harmonysync-audio-service"])
                        .output()
                        .await;
                    
                    info!("Cleaned up potential conflicting processes, retrying...");
                    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
                    
                    // Retry starting the service
                    let mut retry_child = Command::new("node")
                        .arg("server.js")
                        .current_dir(&audio_service_dir)
                        .spawn()
                        .map_err(|e| format!("Failed to restart audio service: {}", e))?;
                    
                    tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;
                    
                    match retry_child.try_wait() {
                        Ok(Some(retry_status)) => {
                            Err(format!("Audio service failed to start after cleanup. Status: {:?}", retry_status))
                        }
                        Ok(None) => {
                            info!("Audio service started successfully after cleanup (PID: {})", retry_child.id().unwrap_or(0));
                            std::mem::forget(retry_child);
                            Ok("Audio service started successfully after cleanup".to_string())
                        }
                        Err(e) => {
                            Err(format!("Failed to check retry service status: {}", e))
                        }
                    }
                }
                
                #[cfg(not(unix))]
                {
                    Err(format!("Audio service exited immediately with status: {:?}. Try manually stopping any existing audio service.", status))
                }
            } else {
                Err(format!("Audio service exited immediately with status: {:?}", status))
            }
        }
        Ok(None) => {
            // Process is still running, detach it
            info!("Audio service started successfully (PID: {})", child.id().unwrap_or(0));
            std::mem::forget(child); // Detach the process
            Ok("Audio service started successfully".to_string())
        }
        Err(e) => {
            Err(format!("Failed to check audio service status: {}", e))
        }
    }
}

#[command]
pub async fn check_audio_service_status() -> Result<bool, String> {
    // Try to connect to the audio service health endpoint
    let client = reqwest::Client::new();
    
    match client
        .get("http://localhost:3001/api/health")
        .timeout(std::time::Duration::from_secs(3))
        .send()
        .await
    {
        Ok(response) => Ok(response.status().is_success()),
        Err(_) => Ok(false), // Service is not running
    }
}

#[command]
pub async fn stop_audio_service() -> Result<String, String> {
    info!("Stopping Node.js audio service...");
    
    // Try to gracefully shutdown the service via API first
    let client = reqwest::Client::new();
    
    match client
        .post("http://localhost:3001/api/shutdown")
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                info!("Audio service shutdown gracefully");
                return Ok("Audio service stopped gracefully".to_string());
            }
        }
        Err(e) => {
            info!("Failed to shutdown audio service gracefully: {}", e);
        }
    }
    
    // If graceful shutdown failed, try to kill the process
    info!("Attempting to kill audio service process...");
    
    #[cfg(unix)]
    {
        match Command::new("pkill")
            .args(&["-f", "harmonysync-audio-service"])
            .output()
            .await
        {
            Ok(output) => {
                if output.status.success() {
                    info!("Audio service process killed successfully");
                    Ok("Audio service stopped forcefully".to_string())
                } else {
                    info!("No audio service process found to kill");
                    Ok("Audio service was not running".to_string())
                }
            }
            Err(e) => {
                error!("Failed to kill audio service process: {}", e);
                Err(format!("Failed to stop audio service: {}", e))
            }
        }
    }
    
    #[cfg(windows)]
    {
        match Command::new("taskkill")
            .args(&["/F", "/IM", "node.exe", "/FI", "WINDOWTITLE eq harmonysync-audio-service*"])
            .output()
            .await
        {
            Ok(output) => {
                if output.status.success() {
                    info!("Audio service process killed successfully");
                    Ok("Audio service stopped forcefully".to_string())
                } else {
                    info!("No audio service process found to kill");
                    Ok("Audio service was not running".to_string())
                }
            }
            Err(e) => {
                error!("Failed to kill audio service process: {}", e);
                Err(format!("Failed to stop audio service: {}", e))
            }
        }
    }
}

#[command]
pub async fn open_preservice_music_window(app_handle: AppHandle) -> Result<(), String> {
    use tauri::{WebviewUrl, WebviewWindowBuilder};
    
    // Check if window already exists
    if let Some(window) = app_handle.get_webview_window("preservice-music") {
        // If it exists, just focus it
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }
    
    // Get main window position to open near it
    let main_window = app_handle.get_webview_window("main")
        .ok_or("Main window not found")?;
    let main_position = main_window.outer_position().map_err(|e| e.to_string())?;
    
    // Create new window
    let window = WebviewWindowBuilder::new(
        &app_handle,
        "preservice-music",
        WebviewUrl::App("preservice-music.html".into())
    )
    .title("Pre-Service Music")
    .inner_size(900.0, 600.0)
    .resizable(true)
    .position(main_position.x as f64 + 50.0, main_position.y as f64 + 50.0)
    .build()
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[command]
pub async fn open_scheduler_window(app_handle: AppHandle) -> Result<(), String> {
    use tauri::{WebviewUrl, WebviewWindowBuilder};
    
    // Check if window already exists
    if let Some(window) = app_handle.get_webview_window("scheduler") {
        // If it exists, just focus it
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }
    
    // Get main window position to open near it
    let main_window = app_handle.get_webview_window("main")
        .ok_or("Main window not found")?;
    let main_position = main_window.outer_position().map_err(|e| e.to_string())?;
    
    // Create new window
    let window = WebviewWindowBuilder::new(
        &app_handle,
        "scheduler",
        WebviewUrl::App("scheduler.html".into())
    )
    .title("Scheduler")
    .inner_size(850.0, 700.0)
    .resizable(true)
    .position(main_position.x as f64 + 50.0, main_position.y as f64 + 50.0)
    .build()
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[command]
pub async fn close_preservice_music_window(app_handle: AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("preservice-music") {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}



#[derive(Clone, serde::Serialize)]
struct TransposeProgressPayload {
    current_file: String,
    total_files: usize,
    completed_files: usize,
    message: String,
}

#[command]
pub async fn transpose_audio_files(
    app_handle: AppHandle,
    directory: String,
    semitones: i32,
) -> Result<String, String> {
    info!("🎵 Transposing audio files in directory: {}, semitones: {}", directory, semitones);
    
    // Read directory entries
    let dir_path = Path::new(&directory);
    let entries = fs::read_dir(dir_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;
    
    // Filter audio files and identify files to exclude from transposition
    let mut audio_files = Vec::new();
    let mut files_to_copy = Vec::new();
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        
        if !path.is_file() {
            continue;
        }
        
        let file_name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");
        
        // Check if it's an audio file
        let is_audio = file_name.ends_with(".mp3") || 
                      file_name.ends_with(".wav") || 
                      file_name.ends_with(".ogg") ||
                      file_name.ends_with(".m4a") ||
                      file_name.ends_with(".flac");
        
        if !is_audio {
            continue;
        }
        
        // Check if file should be excluded from transposition
        let name_lower = file_name.to_lowercase();
        let should_exclude = name_lower.contains("guide") ||
                            name_lower.contains("click") ||
                            name_lower.contains("drums") ||
                            name_lower.contains("percussion") ||
                            name_lower.contains("shakers");
        
        if should_exclude {
            files_to_copy.push(path);
        } else {
            audio_files.push(path);
        }
    }
    
    info!("📁 Found {} audio files to transpose, {} files to copy", audio_files.len(), files_to_copy.len());
    
    // Create output directory with semitone notation
    let dir_name = dir_path.file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid directory name")?;
    
    let parent_dir = dir_path.parent()
        .ok_or("Directory has no parent")?;
    
    let sign = if semitones >= 0 { "+" } else { "" };
    let output_dir_name = format!("{} {} {} semitones", dir_name, sign, semitones);
    let output_dir = parent_dir.join(&output_dir_name);
    
    // Create output directory
    fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Failed to create output directory: {}", e))?;
    
    info!("📂 Created output directory: {:?}", output_dir);
    
    let total_files = audio_files.len() + files_to_copy.len();
    let mut completed_files = 0;
    
    // Copy excluded files
    for file_path in &files_to_copy {
        let file_name = file_path.file_name()
            .and_then(|n| n.to_str())
            .ok_or("Invalid file name")?;
        
        let output_path = output_dir.join(file_name);
        
        app_handle.emit("transpose-progress", TransposeProgressPayload {
            current_file: file_name.to_string(),
            total_files,
            completed_files,
            message: format!("Copying {} (excluded from transposition)", file_name),
        }).map_err(|e| format!("Failed to emit progress: {}", e))?;
        
        fs::copy(file_path, &output_path)
            .map_err(|e| format!("Failed to copy file {}: {}", file_name, e))?;
        
        completed_files += 1;
        info!("📋 Copied: {}", file_name);
    }
    
    // Transpose audio files using ffmpeg
    for file_path in &audio_files {
        let file_name = file_path.file_name()
            .and_then(|n| n.to_str())
            .ok_or("Invalid file name")?;
        
        let output_path = output_dir.join(file_name);
        
        app_handle.emit("transpose-progress", TransposeProgressPayload {
            current_file: file_name.to_string(),
            total_files,
            completed_files,
            message: format!("Transposing {}", file_name),
        }).map_err(|e| format!("Failed to emit progress: {}", e))?;
        
        // Use ffmpeg to transpose the audio
        // We use the asetrate filter to change pitch while maintaining duration
        // Formula: for N semitones up, multiply rate by 2^(N/12)
        let rate_multiplier = 2.0_f64.powf(semitones as f64 / 12.0);
        
        // Standard sample rate
        let base_rate = 48000.0;
        let new_rate = (base_rate * rate_multiplier) as u32;
        
        // Build the filter: asetrate changes the sample rate (which changes pitch and duration),
        // then atempo restores original duration
        let filter = format!("asetrate={},aresample={},atempo={}", 
            new_rate, 
            base_rate as u32,
            1.0 / rate_multiplier
        );
        
        let mut command = Command::new("ffmpeg");
        command
            .arg("-i")
            .arg(file_path.to_str().unwrap())
            .arg("-filter:a")
            .arg(&filter)
            .arg("-y") // Overwrite output file
            .arg(output_path.to_str().unwrap())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null());
        
        let status = command.status().await
            .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;
        
        if !status.success() {
            return Err(format!("ffmpeg failed to transpose {}", file_name));
        }
        
        completed_files += 1;
        info!("✅ Transposed: {}", file_name);
    }
    
    app_handle.emit("transpose-progress", TransposeProgressPayload {
        current_file: String::new(),
        total_files,
        completed_files,
        message: "Transposition complete!".to_string(),
    }).map_err(|e| format!("Failed to emit progress: {}", e))?;
    
    info!("✅ Transposition complete. Output directory: {:?}", output_dir);
    
    Ok(output_dir.to_str().unwrap().to_string())
}

#[command]
pub async fn open_lyrics_file(path: String) -> Result<(), String> {
    info!("Opening lyrics file: {}", path);
    
    // Use the system's default text editor to open the file
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open lyrics file: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open lyrics file: {}", e))?;
    }
    
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(&["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("Failed to open lyrics file: {}", e))?;
    }
    
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DisplayInfo {
    id: String,
    name: String,
}

#[command]
pub async fn get_available_displays() -> Result<Vec<DisplayInfo>, String> {
    info!("Getting available displays");
    
    // For now, we'll return a simple list based on the platform
    // In a production app, you'd use platform-specific APIs to enumerate displays
    // On Linux: xrandr or wayland protocols
    // On macOS: CoreGraphics
    // On Windows: EnumDisplayDevices
    
    #[cfg(target_os = "linux")]
    {
        // Try to get display info from xrandr
        match tokio::process::Command::new("xrandr")
            .arg("--query")
            .output()
            .await
        {
            Ok(output) => {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    let mut displays = Vec::new();
                    
                    // Parse xrandr output for connected displays
                    for (i, line) in stdout.lines().enumerate() {
                        if line.contains(" connected") {
                            let parts: Vec<&str> = line.split_whitespace().collect();
                            if !parts.is_empty() {
                                let display_name = parts[0];
                                displays.push(DisplayInfo {
                                    id: format!("display_{}", i),
                                    name: format!("{} (Connected)", display_name),
                                });
                            }
                        }
                    }
                    
                    if displays.is_empty() {
                        // Fallback if no displays found
                        displays.push(DisplayInfo {
                            id: "primary".to_string(),
                            name: "Primary Display".to_string(),
                        });
                    }
                    
                    return Ok(displays);
                }
            }
            Err(_) => {
                info!("xrandr not available, using fallback");
            }
        }
    }
    
    // Fallback for all platforms
    Ok(vec![
        DisplayInfo {
            id: "primary".to_string(),
            name: "Primary Display".to_string(),
        },
        DisplayInfo {
            id: "secondary".to_string(),
            name: "Secondary Display".to_string(),
        },
    ])
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AudioDeviceInfo {
    id: String,
    name: String,
}

#[command]
pub async fn get_available_audio_devices() -> Result<Vec<AudioDeviceInfo>, String> {
    info!("Getting available audio devices");
    
    // For now, return a simple list
    // In production, you'd use cpal or similar crate to enumerate audio devices
    Ok(vec![
        AudioDeviceInfo {
            id: "default".to_string(),
            name: "Default Audio Device".to_string(),
        },
    ])
}

#[command]
pub async fn get_available_midi_inputs() -> Result<Vec<AudioDeviceInfo>, String> {
    info!("Getting available MIDI input devices");
    
    // For now, return empty list
    // In production, you'd use midir crate to enumerate MIDI devices
    Ok(vec![])
}

#[command]
pub async fn get_available_midi_outputs() -> Result<Vec<AudioDeviceInfo>, String> {
    info!("Getting available MIDI output devices");
    
    // For now, return empty list
    // In production, you'd use midir crate to enumerate MIDI devices
    Ok(vec![])
}

// DMX Commands
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DmxFixture {
    pub id: String,
    pub name: String,
    pub fixture_type: String,
    pub dmx_address: i32,
    pub universe: i32,
    pub channel_count: i32,
    pub channel_definitions: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DmxScene {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub fade_time_ms: i32,
    pub scene_data: String,
}

#[command]
pub async fn get_dmx_fixtures() -> Result<Vec<DmxFixture>, String> {
    info!("Getting all DMX fixtures");
    use rusqlite::Connection;
    
    let conn = Connection::open("harmonylink.sqlite")
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let mut stmt = conn.prepare("SELECT id, name, fixture_type, dmx_address, universe, channel_count, channel_definitions FROM dmx_fixtures")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let fixtures = stmt.query_map([], |row| {
        Ok(DmxFixture {
            id: row.get(0)?,
            name: row.get(1)?,
            fixture_type: row.get(2)?,
            dmx_address: row.get(3)?,
            universe: row.get(4)?,
            channel_count: row.get(5)?,
            channel_definitions: row.get(6)?,
        })
    })
    .map_err(|e| format!("Failed to query fixtures: {}", e))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect fixtures: {}", e))?;
    
    Ok(fixtures)
}

#[command]
pub async fn add_dmx_fixture(fixture: DmxFixture) -> Result<DmxFixture, String> {
    info!("Adding DMX fixture: {}", fixture.name);
    use rusqlite::Connection;
    
    let conn = Connection::open("harmonylink.sqlite")
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    conn.execute(
        "INSERT INTO dmx_fixtures (id, name, fixture_type, dmx_address, universe, channel_count, channel_definitions) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![fixture.id, fixture.name, fixture.fixture_type, fixture.dmx_address, fixture.universe, fixture.channel_count, fixture.channel_definitions],
    )
    .map_err(|e| format!("Failed to insert fixture: {}", e))?;
    
    Ok(fixture)
}

#[command]
pub async fn update_dmx_fixture(fixture: DmxFixture) -> Result<(), String> {
    info!("Updating DMX fixture: {}", fixture.name);
    use rusqlite::Connection;
    
    let conn = Connection::open("harmonylink.sqlite")
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    conn.execute(
        "UPDATE dmx_fixtures SET name = ?1, fixture_type = ?2, dmx_address = ?3, universe = ?4, channel_count = ?5, channel_definitions = ?6 WHERE id = ?7",
        rusqlite::params![fixture.name, fixture.fixture_type, fixture.dmx_address, fixture.universe, fixture.channel_count, fixture.channel_definitions, fixture.id],
    )
    .map_err(|e| format!("Failed to update fixture: {}", e))?;
    
    Ok(())
}

#[command]
pub async fn delete_dmx_fixture(id: String) -> Result<(), String> {
    info!("Deleting DMX fixture: {}", id);
    use rusqlite::Connection;
    
    let conn = Connection::open("harmonylink.sqlite")
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    conn.execute("DELETE FROM dmx_fixtures WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| format!("Failed to delete fixture: {}", e))?;
    
    Ok(())
}

#[command]
pub async fn get_dmx_scenes() -> Result<Vec<DmxScene>, String> {
    info!("Getting all DMX scenes");
    use rusqlite::Connection;
    
    let conn = Connection::open("harmonylink.sqlite")
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let mut stmt = conn.prepare("SELECT id, name, description, fade_time_ms, scene_data FROM dmx_scenes")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let scenes = stmt.query_map([], |row| {
        Ok(DmxScene {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            fade_time_ms: row.get(3)?,
            scene_data: row.get(4)?,
        })
    })
    .map_err(|e| format!("Failed to query scenes: {}", e))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect scenes: {}", e))?;
    
    Ok(scenes)
}

#[command]
pub async fn create_dmx_scene(scene: DmxScene) -> Result<DmxScene, String> {
    info!("Creating DMX scene: {}", scene.name);
    use rusqlite::Connection;
    
    let conn = Connection::open("harmonylink.sqlite")
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    conn.execute(
        "INSERT INTO dmx_scenes (id, name, description, fade_time_ms, scene_data) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![scene.id, scene.name, scene.description, scene.fade_time_ms, scene.scene_data],
    )
    .map_err(|e| format!("Failed to insert scene: {}", e))?;
    
    Ok(scene)
}

#[command]
pub async fn update_dmx_scene(scene: DmxScene) -> Result<(), String> {
    info!("Updating DMX scene: {}", scene.name);
    use rusqlite::Connection;
    
    let conn = Connection::open("harmonylink.sqlite")
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    conn.execute(
        "UPDATE dmx_scenes SET name = ?1, description = ?2, fade_time_ms = ?3, scene_data = ?4 WHERE id = ?5",
        rusqlite::params![scene.name, scene.description, scene.fade_time_ms, scene.scene_data, scene.id],
    )
    .map_err(|e| format!("Failed to update scene: {}", e))?;
    
    Ok(())
}

#[command]
pub async fn delete_dmx_scene(id: String) -> Result<(), String> {
    info!("Deleting DMX scene: {}", id);
    use rusqlite::Connection;
    
    let conn = Connection::open("harmonylink.sqlite")
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    conn.execute("DELETE FROM dmx_scenes WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| format!("Failed to delete scene: {}", e))?;
    
    Ok(())
}

#[command]
pub async fn recall_dmx_scene(scene_id: String) -> Result<(), String> {
    info!("Recalling DMX scene: {}", scene_id);
    use rusqlite::Connection;
    
    let conn = Connection::open("harmonylink.sqlite")
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let scene: DmxScene = conn.query_row(
        "SELECT id, name, description, fade_time_ms, scene_data FROM dmx_scenes WHERE id = ?1",
        rusqlite::params![scene_id],
        |row| {
            Ok(DmxScene {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                fade_time_ms: row.get(3)?,
                scene_data: row.get(4)?,
            })
        }
    )
    .map_err(|e| format!("Failed to find scene: {}", e))?;
    
    // TODO: Implement actual DMX output here
    // For now, just log that we're recalling the scene
    info!("Would recall scene '{}' with fade time {}ms", scene.name, scene.fade_time_ms);
    info!("Scene data: {}", scene.scene_data);
    
    Ok(())
}

// Performance monitoring command
#[command]
pub fn get_performance_metrics() -> performance::PerformanceMetrics {
    info!("Getting performance metrics");
    performance::get_system_metrics()
}

// Lyrics fetching commands
#[command]
pub async fn fetch_lyrics_from_genius(
    song_title: String,
    artist: Option<String>,
) -> Result<lyrics_fetcher::LyricsResult, String> {
    info!("Fetching lyrics for: {} by {:?}", song_title, artist);
    
    let client = lyrics_fetcher::GeniusClient::new(None);
    
    match client.get_lyrics(&song_title, artist.as_deref()).await {
        Ok(result) => {
            info!("Successfully fetched lyrics from {}", result.source);
            Ok(result)
        }
        Err(e) => {
            error!("Failed to fetch lyrics: {}", e);
            Err(format!("Failed to fetch lyrics: {}", e))
        }
    }
}

#[command]
pub async fn save_lyrics_to_file(
    folder_path: String,
    lyrics: String,
) -> Result<String, String> {
    info!("Saving lyrics to folder: {}", folder_path);
    
    let mut lyrics_path = PathBuf::from(&folder_path);
    lyrics_path.push("lyrics.txt");
    
    match fs::write(&lyrics_path, lyrics) {
        Ok(_) => {
            info!("Successfully saved lyrics to: {}", lyrics_path.display());
            Ok(lyrics_path.to_string_lossy().to_string())
        }
        Err(e) => {
            error!("Failed to save lyrics: {}", e);
            Err(format!("Failed to save lyrics: {}", e))
        }
    }
}

#[command]
pub async fn fetch_and_save_lyrics(
    song_title: String,
    artist: Option<String>,
    folder_path: String,
) -> Result<String, String> {
    info!("Fetching and saving lyrics for: {} to {}", song_title, folder_path);
    
    // Fetch lyrics
    let lyrics_result = fetch_lyrics_from_genius(song_title, artist).await?;
    
    // Format lyrics with sections
    let formatted_lyrics = lyrics_fetcher::format_lyrics_with_sections(&lyrics_result.lyrics);
    
    // Save to file
    save_lyrics_to_file(folder_path, formatted_lyrics).await
}


