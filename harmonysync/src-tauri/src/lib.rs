mod application;

use tauri::menu::{Menu, Submenu, MenuItem, PredefinedMenuItem};
use tauri::{Manager, Emitter};


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
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let handle = app.handle();

            // Create the 'File' menu
            let close_item = PredefinedMenuItem::close_window(handle, None)?;
            let file_submenu = Submenu::with_items(
                handle,
                "File",
                true,
                &[&close_item],
            )?;

            // Create the 'Settings' menu
            let display_settings_item = MenuItem::with_id(handle, "display-settings", "Display Settings", true, None as Option<&str>)?;
            let settings_submenu = Submenu::with_items(
                handle,
                "Settings",
                true,
                &[&display_settings_item],
            )?;

            // Create the main menu bar
            let menu = Menu::with_items(handle, &[&file_submenu, &settings_submenu])?;

            // Set the menu only for the main window, not child windows
            if let Some(main_window) = app.get_webview_window("main") {
                main_window.set_menu(menu)?;
            }

            setup_windows(app)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            match event.id().0.as_str() {
                "display-settings" => {
                    if let Err(e) = app.emit("display-settings-clicked", ()) {
                        eprintln!("Failed to emit display-settings-clicked event: {}", e);
                    }
                }
                _ => {}
            }
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

                        // Stop the audio service
                        if let Err(e) = application::commands::stop_audio_service().await {
                            eprintln!("Failed to stop audio service: {}", e);
                        } else {
                            println!("Audio service stopped successfully");
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
            application::commands::stop_http_server,
            application::commands::execute_macro,
            application::commands::start_audio_service,
            application::commands::check_audio_service_status,
            application::commands::stop_audio_service,
            application::commands::open_preservice_music_window,
            application::commands::open_scheduler_window,
            application::commands::close_preservice_music_window,
            application::commands::transpose_audio_files,
            application::commands::open_lyrics_file,
            application::commands::get_available_displays,
            application::commands::get_available_audio_devices,
            application::commands::get_available_midi_inputs,
            application::commands::get_available_midi_outputs,
            // Legacy audio decoder commands removed - now using Node.js service
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}