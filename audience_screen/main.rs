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

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    #[test]
    fn test_audience_update_deserialize() {
        let json = r#"{
            "video_path": "/videos/bg.mp4",
            "line1": "First line",
            "line2": "Second line"
        }"#;
        let update: AudienceUpdate = serde_json::from_str(json).unwrap();
        assert_eq!(update.video_path, "/videos/bg.mp4");
        assert_eq!(update.line1, "First line");
        assert_eq!(update.line2, "Second line");
    }

    #[test]
    fn test_audience_screen_app_default() {
        let app = AudienceScreenApp::default();
        assert_eq!(*app.video_path.lock().unwrap(), "");
        assert_eq!(*app.line1.lock().unwrap(), "");
        assert_eq!(*app.line2.lock().unwrap(), "");
        assert!(app.player.is_none());
    }

    #[test]
    fn test_update_fields_from_update() {
        let app = AudienceScreenApp::default();
        let update = AudienceUpdate {
            video_path: "test.mp4".to_string(),
            line1: "Line 1".to_string(),
            line2: "Line 2".to_string(),
        };
        {
            *app.video_path.lock().unwrap() = update.video_path.clone();
            *app.line1.lock().unwrap() = update.line1.clone();
            *app.line2.lock().unwrap() = update.line2.clone();
        }
        assert_eq!(*app.video_path.lock().unwrap(), "test.mp4");
        assert_eq!(*app.line1.lock().unwrap(), "Line 1");
        assert_eq!(*app.line2.lock().unwrap(), "Line 2");
    }
}

fn main() -> eframe::Result<()> {
    let app = AudienceScreenApp::default();
    let native_options = eframe::NativeOptions::default();
    eframe::run_native(Box::new(app), native_options);
    Ok(())
}