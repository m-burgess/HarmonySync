mod application;
mod domain;

use tauri::Manager;

fn setup_windows(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let main_window = app.get_webview_window("main").unwrap();

    if cfg!(debug_assertions) {
        main_window.open_devtools();
    }
    Ok(())
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            setup_windows(app)
        })
        .invoke_handler(tauri::generate_handler![
            application::commands::generate_background_css,
            application::commands::display_video_slide,
            application::commands::get_video_metadata,
            application::commands::transcode_video,
            application::commands::stream_video_with_vlc,
            application::commands::stop_vlc_stream,
            application::commands::convert_to_ogg
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}