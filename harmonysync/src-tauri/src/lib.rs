mod application;
mod domain;

use tauri::{Manager};

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
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    // Prevent the default window close
                    api.prevent_close();

                    // Get a handle to the app
                    let app_handle = window.app_handle().clone();

                    // Spawn a new async task to handle the cleanup
                    tauri::async_runtime::spawn(async move {
                        // Close all other windows
                        for (label, other_window) in app_handle.webview_windows() {
                            if label != "main" {
                                if let Err(e) = other_window.close() {
                                    eprintln!("Failed to close window {}: {}", label, e);
                                }
                            }
                        }

                        // Stop the HTTP server
                        if let Err(e) = application::commands::stop_http_server().await {
                            eprintln!("Failed to stop HTTP server: {}", e);
                        }

                        // Exit the app
                        app_handle.exit(0);
                    });
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            application::commands::generate_background_css,
            application::commands::display_video_slide,
            application::commands::get_video_metadata,
            application::commands::transcode_video,


            application::commands::convert_to_ogg,
            application::commands::start_http_server,
            application::commands::stop_http_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}