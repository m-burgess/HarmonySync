use egui_video::VideoPlayer;
use eframe::{egui, epi};
use std::net::TcpListener;
use std::thread;
use std::sync::{Arc, Mutex};
use serde::Deserialize;

#[derive(Deserialize, Debug, Clone)]
pub struct AudienceUpdate {
    pub video_path: String,
    pub line1: String,
    pub line2: String,
}

/// Updates the audience screen with a new background and lyrics, with fade-in/out.
pub fn update_audience_screen(
    audience_ui: &Weak<ComponentHandle>,
    background_path: &str,
    line1: &str,
    line2: &str,
) {
    if let Some(ui) = audience_ui.upgrade() {
        // Fade out current background
        ui.set_property("background_opacity", 0.0f32);

        // After fade out, update background and fade in
        let ui_clone = audience_ui.clone();
        let background_path = background_path.to_owned();
        let line1 = line1.to_owned();
        let line2 = line2.to_owned();
        Timer::single_shot(std::time::Duration::from_millis(400), move || {
            if let Some(ui) = ui_clone.upgrade() {
                ui.set_property("background_source", SharedString::from(background_path.clone()));
                ui.set_property("line1", SharedString::from(line1.clone()));
                ui.set_property("line2", SharedString::from(line2.clone()));
                ui.set_property("background_opacity", 1.0f32);
            }
        });
    }
}

pub struct AudienceScreenApp {
    pub video_path: Arc<Mutex<String>>,
    pub line1: Arc<Mutex<String>>,
    pub line2: Arc<Mutex<String>>,
    pub player: Option<VideoPlayer>,
}

impl Default for AudienceScreenApp {
    fn default() -> Self {
        let video_path = Arc::new(Mutex::new(String::new()));
        let line1 = Arc::new(Mutex::new(String::new()));
        let line2 = Arc::new(Mutex::new(String::new()));

        // Start TCP listener in a background thread
        let video_path_clone = video_path.clone();
        let line1_clone = line1.clone();
        let line2_clone = line2.clone();
        thread::spawn(move || {
            let listener = TcpListener::bind("127.0.0.1:7878").expect("Failed to bind TCP port 7878");
            for stream in listener.incoming() {
                if let Ok(mut stream) = stream {
                    let mut buf = String::new();
                    use std::io::Read;
                    stream.read_to_string(&mut buf).ok();
                    if let Ok(update) = serde_json::from_str::<AudienceUpdate>(&buf) {
                        *video_path_clone.lock().unwrap() = update.video_path;
                        *line1_clone.lock().unwrap() = update.line1;
                        *line2_clone.lock().unwrap() = update.line2;
                    }
                }
            }
        });

        Self {
            video_path,
            line1,
            line2,
            player: None,
        }
    }
}

impl epi::App for AudienceScreenApp {
    fn name(&self) -> &str {
        "Audience Screen"
    }

    fn update(&mut self, ctx: &egui::Context, _frame: &mut epi::Frame) {
        let video_path = self.video_path.lock().unwrap().clone();
        let line1 = self.line1.lock().unwrap().clone();
        let line2 = self.line2.lock().unwrap().clone();

        egui::CentralPanel::default().show(ctx, |ui| {
            if (self.player.is_none() && !video_path.is_empty()) || (self.player.is_some() && self.player.as_ref().unwrap().path() != video_path) {
                self.player = Some(VideoPlayer::new(&video_path));
            }
            if let Some(player) = &mut self.player {
                player.ui(ui);
            }
            ui.vertical_centered(|ui| {
                ui.add_space(20.0);
                ui.heading(&line1);
                ui.heading(&line2);
            });
        });
    }
}

// Example: Launch with eframe
// fn main() -> eframe::Result<()> {
//     let app = AudienceScreenApp::default();
//     let native_options = eframe::NativeOptions::default();
//     eframe::run_native(Box::new(app), native_options);
//     Ok(())
// }