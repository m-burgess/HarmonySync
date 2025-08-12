// src/main.rs (Updated with Bible functionality)
use std::cell::RefCell;
use std::fs::File;
use std::io::Write;
use std::net::TcpStream;
use std::path::PathBuf;
use std::rc::Rc;
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};

use midir::{MidiInput, MidiOutput};
use rodio::{OutputStream, Sink, Source};
use serde::Serialize;
use slint::{Model, SharedString, VecModel};

use crate::application::use_cases::LoadSongUseCase;
use crate::application::bible_use_case::FetchBibleVerseUseCase;
use crate::domain::entities::{Pan as DomainPan, Slide as DomainSlide, Song as DomainSong, Track as DomainTrack};
use crate::infrastructure::repositories::{AudioRepository, FileRepository};

mod application;
mod domain;
mod infrastructure;

slint::include_modules!();

struct AudioPlayer {
    sinks: Vec<Arc<Mutex<Sink>>>,
    _stream: OutputStream,
}

struct AppState {
    current_song: Option<DomainSong>,
    current_slides: Vec<DomainSlide>, // Can hold song slides or Bible verses
    current_slide_idx: usize,
    current_content_type: ContentType,
    audio_player: Option<AudioPlayer>,
    midi_input: Option<MidiInput>,
    midi_output: Option<MidiOutput>,
    start_time: Option<SystemTime>,
    bible_use_case: FetchBibleVerseUseCase,
}

#[derive(Clone, Copy, PartialEq)]
enum ContentType {
    Song,
    BibleVerse,
    Media,
}

#[derive(Serialize)]
struct AudienceUpdate {
    video_path: String,
    line1: String,
    line2: String,
}

pub fn send_audience_update(video_path: &str, line1: &str, line2: &str) {
    if let Ok(mut stream) = TcpStream::connect("127.0.0.1:7878") {
        let update = AudienceUpdate {
            video_path: video_path.to_string(),
            line1: line1.to_string(),
            line2: line2.to_string(),
        };
        let msg = serde_json::to_string(&update).unwrap();
        let _ = stream.write_all(msg.as_bytes());
    }
}

fn main() -> Result<(), slint::PlatformError> {
    let ui = MainWindow::new()?;
    let app_state: Rc<RefCell<AppState>> = Rc::new(RefCell::new(AppState {
        current_song: None,
        current_slides: Vec::new(),
        current_slide_idx: 0,
        current_content_type: ContentType::Song,
        audio_player: None,
        midi_input: None,
        midi_output: None,
        start_time: None,
        bible_use_case: FetchBibleVerseUseCase::new(None), // Use free API by default
    }));
    let library_path: Rc<RefCell<Option<PathBuf>>> = Rc::new(RefCell::new(None));
    let setlist_model: Rc<VecModel<SharedString>> = Rc::new(VecModel::default());
    ui.set_setlist_model(setlist_model.clone().into());

    // Set up popular Bible verses for quick access
    let popular_verses: Vec<SharedString> = FetchBibleVerseUseCase::get_popular_verses()
        .into_iter()
        .map(|(reference, _)| SharedString::from(reference))
        .collect();
    let popular_verses_model = VecModel::from(popular_verses);
    ui.set_popular_verses_model(popular_verses_model.into());

    let ui_weak = ui.as_weak();

    // Initialize MIDI
    let midi_in = MidiInput::new("SlingPresenterInput").unwrap();
    let midi_out = MidiOutput::new("SlingPresenterOutput").unwrap();
    app_state.borrow_mut().midi_input = Some(midi_in);
    app_state.borrow_mut().midi_output = Some(midi_out);

    // Choose library folder
    ui.on_choose_library_folder({
        let library_path = library_path.clone();
        let ui_weak = ui_weak.clone();
        move || {
            if let Some(path) = rfd::FileDialog::new().pick_folder() {
                let songs: Vec<SharedString> = std::fs::read_dir(&path)
                    .unwrap()
                    .filter_map(|e| e.ok())
                    .filter(|e| e.path().is_dir())
                    .map(|e| SharedString::from(e.file_name().to_string_lossy().as_ref()))
                    .collect();
                let model = VecModel::from(songs);
                ui_weak.upgrade().unwrap().set_library_model(model.into());
                *library_path.borrow_mut() = Some(path);
            }
        }
    });

    // Add song to setlist
    ui.on_add_song_to_setlist({
        let setlist_model = setlist_model.clone();
        move |song| {
            setlist_model.push(song);
        }
    });

    // Load song
    ui.on_load_song({
        let library_path = library_path.clone();
        let app_state = app_state.clone();
        let ui_weak = ui_weak.clone();
        move |song_name| {
            if let Some(lib_path) = library_path.borrow().as_ref() {
                let song_folder = lib_path.join(song_name.as_str());
                let file_repo = FileRepository::new();
                let audio_repo = AudioRepository::new();
                let use_case = LoadSongUseCase::new(file_repo, audio_repo);
                if let Ok(domain_song) = use_case.execute(&song_folder) {
                    let slint_tracks: Vec<Track> = domain_song.tracks.iter().map(|t| Track {
                        name: t.name.clone().into(),
                        volume: t.volume,
                        pan: match t.pan {
                            DomainPan::Left => Pan::left,
                            DomainPan::Center => Pan::center,
                            DomainPan::Right => Pan::right,
                        },
                        mute: t.mute,
                        solo: t.solo,
                        transpose: t.transpose,
                    }).collect();

                    let slint_slides: Vec<Slide> = domain_song.slides.iter().map(|s| Slide {
                        line1: s.lines[0].clone().into(),
                        line2: s.lines[1].clone().into(),
                    }).collect();

                    let slint_config = MixerConfig {
                        transpose_semitones: domain_song.config.transpose_semitones,
                        low_cut: domain_song.config.low_cut,
                        high_cut: domain_song.config.high_cut,
                        limiter_threshold: domain_song.config.limiter_threshold,
                    };

                    let slint_song = Song {
                        name: domain_song.name.clone().into(),
                        tracks: slint_tracks.into(),
                        slides: slint_slides.into(),
                        metronome: domain_song.metronome,
                        config: slint_config,
                    };

                    {
                        let mut state = app_state.borrow_mut();
                        state.current_song = Some(domain_song.clone());
                        state.current_slides = domain_song.slides;
                        state.current_slide_idx = 0;
                        state.current_content_type = ContentType::Song;
                    }

                    ui_weak.upgrade().unwrap().set_current_song(slint_song);
                    update_audience_screen(&ui_weak, &app_state);
                    update_confidence_monitor(&ui_weak, &app_state);
                }
            }
        }
    });

    // Fetch Bible verse
    ui.on_fetch_bible_verse({
        let app_state = app_state.clone();
        let ui_weak = ui_weak.clone();
        move |reference, version| {
            let mut state = app_state.borrow_mut();
            
            // Validate reference first
            if let Err(error) = state.bible_use_case.validate_reference(&reference) {
                ui_weak.upgrade().unwrap().set_bible_error(SharedString::from(error));
                return;
            }

            // Fetch verse using free API
            match state.bible_use_case.execute(&reference, &version, true) {
                Ok(slides) => {
                    state.current_slides = slides;
                    state.current_slide_idx = 0;
                    state.current_content_type = ContentType::BibleVerse;
                    state.current_song = None; // Clear current song when showing Bible verse
                    
                    // Convert to Slint slides for UI
                    let slint_slides: Vec<Slide> = state.current_slides.iter().map(|s| Slide {
                        line1: s.lines[0].clone().into(),
                        line2: s.lines[1].clone().into(),
                    }).collect();
                    
                    ui_weak.upgrade().unwrap().set_bible_slides(slint_slides.into());
                    ui_weak.upgrade().unwrap().set_bible_error(SharedString::from(""));
                    
                    drop(state); // Release the borrow before calling update functions
                    update_audience_screen(&ui_weak, &app_state);
                    update_confidence_monitor(&ui_weak, &app_state);
                },
                Err(error) => {
                    ui_weak.upgrade().unwrap().set_bible_error(SharedString::from(error.to_string()));
                }
            }
        }
    });

    // Load popular Bible verse
    ui.on_load_popular_verse({
        let app_state = app_state.clone();
        let ui_weak = ui_weak.clone();
        move |reference| {
            let mut state = app_state.borrow_mut();
            
            match state.bible_use_case.execute(&reference, "NIV", true) {
                Ok(slides) => {
                    state.current_slides = slides;
                    state.current_slide_idx = 0;
                    state.current_content_type = ContentType::BibleVerse;
                    state.current_song = None;
                    
                    let slint_slides: Vec<Slide> = state.current_slides.iter().map(|s| Slide {
                        line1: s.lines[0].clone().into(),
                        line2: s.lines[1].clone().into(),
                    }).collect();
                    
                    ui_weak.upgrade().unwrap().set_bible_slides(slint_slides.into());
                    ui_weak.upgrade().unwrap().set_bible_error(SharedString::from(""));
                    
                    drop(state);
                    update_audience_screen(&ui_weak, &app_state);
                    update_confidence_monitor(&ui_weak, &app_state);
                },
                Err(error) => {
                    ui_weak.upgrade().unwrap().set_bible_error(SharedString::from(error.to_string()));
                }
            }
        }
    });

    // Search Bible verses by keyword
    ui.on_search_bible_verses({
        let app_state = app_state.clone();
        let ui_weak = ui_weak.clone();
        move |keyword| {
            let state = app_state.borrow();
            
            match state.bible_use_case.search_verses_by_keyword(&keyword, "NIV", 10) {
                Ok(verses) => {
                    let search_results: Vec<SharedString> = verses.iter()
                        .map(|v| SharedString::from(format!("{} - {}", v.reference, 
                            if v.text.len() > 50 { 
                                format!("{}...", &v.text[..50]) 
                            } else { 
                                v.text.clone() 
                            })))
                        .collect();
                    
                    let results_model = VecModel::from(search_results);
                    ui_weak.upgrade().unwrap().set_search_results_model(results_model.into());
                },
                Err(error) => {
                    ui_weak.upgrade().unwrap().set_bible_error(SharedString::from(error.to_string()));
                }
            }
        }
    });

    // Play song
    ui.on_play_song({
        let app_state = app_state.clone();
        let ui_weak = ui_weak.clone();
        move || {
            let mut state = app_state.borrow_mut();
            if let Some(song) = &state.current_song {
                let (_stream, stream_handle) = OutputStream::try_default().unwrap();
                let mut sinks = vec![];
                for track in &song.tracks {
                    if !track.mute {
                        let file = std::fs::File::open(&track.path).unwrap();
                        let source = rodio::Decoder::new(file).unwrap();
                        let sink = Sink::try_new(&stream_handle).unwrap();
                        sink.append(source);
                        sinks.push(Arc::new(Mutex::new(sink)));
                    }
                }
                state.audio_player = Some(AudioPlayer { sinks, _stream });
                state.start_time = Some(SystemTime::now());
            }
            drop(state);
            update_confidence_monitor(&ui_weak, &app_state);
        }
    });

    // Stop song
    ui.on_stop_song({
        let app_state = app_state.clone();
        let ui_weak = ui_weak.clone();
        move || {
            let mut state = app_state.borrow_mut();
            if let Some(player) = state.audio_player.take() {
                for sink in player.sinks {
                    sink.lock().unwrap().stop();
                }
            }
            state.start_time = None;
            drop(state);
            update_confidence_monitor(&ui_weak, &app_state);
        }
    });

    // Volume changed
    ui.on_volume_changed({
        let app_state = app_state.clone();
        move |track_idx, volume| {
            let mut state = app_state.borrow_mut();
            if let Some(song) = &mut state.current_song {
                if let Some(track) = song.tracks.get_mut(track_idx as usize) {
                    track.volume = volume;
                    if let Some(player) = &state.audio_player {
                        if let Some(sink) = player.sinks.get(track_idx as usize) {
                            sink.lock().unwrap().set_volume(volume);
                        }
                    }
                }
            }
        }
    });

    // Pan changed
    ui.on_pan_changed({
        let app_state = app_state.clone();
        move |track_idx, pan| {
            let mut state = app_state.borrow_mut();
            if let Some(song) = &mut state.current_song {
                if let Some(track) = song.tracks.get_mut(track_idx as usize) {
                    track.pan = match pan {
                        Pan::left => DomainPan::Left,
                        Pan::center => DomainPan::Center,
                        Pan::right => DomainPan::Right,
                    };
                }
            }
        }
    });

    // Mute changed
    ui.on_mute_changed({
        let app_state = app_state.clone();
        move |track_idx, mute| {
            let mut state = app_state.borrow_mut();
            if let Some(song) = &mut state.current_song {
                if let Some(track) = song.tracks.get_mut(track_idx as usize) {
                    track.mute = mute;
                    if let Some(player) = &state.audio_player {
                        if let Some(sink) = player.sinks.get(track_idx as usize) {
                            sink.lock().unwrap().set_volume(if mute { 0.0 } else { track.volume });
                        }
                    }
                }
            }
        }
    });

    // Solo changed
    ui.on_solo_changed({
        let app_state = app_state.clone();
        move |track_idx, solo| {
            let mut state = app_state.borrow_mut();
            if let Some(song) = &mut state.current_song {
                if let Some(track) = song.tracks.get_mut(track_idx as usize) {
                    track.solo = solo;
                    if let Some(player) = &state.audio_player {
                        for (i, sink) in player.sinks.iter().enumerate() {
                            let t = &song.tracks[i];
                            let should_mute = t.solo && !solo || !t.solo && solo && i != track_idx as usize;
                            sink.lock().unwrap().set_volume(if should_mute { 0.0 } else { t.volume });
                        }
                    }
                }
            }
        }
    });

    // Transpose changed
    ui.on_transpose_changed({
        let app_state = app_state.clone();
        move |semitones| {
            let mut state = app_state.borrow_mut();
            if let Some(song) = &mut state.current_song {
                song.config.transpose_semitones = semitones;
            }
        }
    });

    // Low cut changed
    ui.on_low_cut_changed({
        let app_state = app_state.clone();
        move |value| {
            let mut state = app_state.borrow_mut();
            if let Some(song) = &mut state.current_song {
                song.config.low_cut = value;
            }
        }
    });

    // High cut changed
    ui.on_high_cut_changed({
        let app_state = app_state.clone();
        move |value| {
            let mut state = app_state.borrow_mut();
            if let Some(song) = &mut state.current_song {
                song.config.high_cut = value;
            }
        }
    });

    // Limiter threshold changed
    ui.on_limiter_threshold_changed({
        let app_state = app_state.clone();
        move |value| {
            let mut state = app_state.borrow_mut();
            if let Some(song) = &mut state.current_song {
                song.config.limiter_threshold = value;
            }
        }
    });

    // Metronome changed
    ui.on_metronome_changed({
        let app_state = app_state.clone();
        move |enabled| {
            let mut state = app_state.borrow_mut();
            if let Some(song) = &mut state.current_song {
                song.metronome = enabled;
            }
        }
    });

    // Next slide (works for both songs and Bible verses)
    ui.on_next_slide({
        let app_state = app_state.clone();
        let ui_weak = ui_weak.clone();
        move || {
            let mut state = app_state.borrow_mut();
            if !state.current_slides.is_empty() {
                if state.current_slide_idx < state.current_slides.len().saturating_sub(1) {
                    state.current_slide_idx += 1;
                    drop(state);
                    update_audience_screen(&ui_weak, &app_state);
                    update_confidence_monitor(&ui_weak, &app_state);
                }
            }
        }
    });

    // Previous slide (works for both songs and Bible verses)
    ui.on_previous_slide({
        let app_state = app_state.clone();
        let ui_weak = ui_weak.clone();
        move || {
            let mut state = app_state.borrow_mut();
            if state.current_slide_idx > 0 {
                state.current_slide_idx -= 1;
                drop(state);
                update_audience_screen(&ui_weak, &app_state);
                update_confidence_monitor(&ui_weak, &app_state);
            }
        }
    });

    // Jump to specific slide
    ui.on_jump_to_slide({
        let app_state = app_state.clone();
        let ui_weak = ui_weak.clone();
        move |slide_idx| {
            let mut state = app_state.borrow_mut();
            if slide_idx >= 0 && (slide_idx as usize) < state.current_slides.len() {
                state.current_slide_idx = slide_idx as usize;
                drop(state);
                update_audience_screen(&ui_weak, &app_state);
                update_confidence_monitor(&ui_weak, &app_state);
            }
        }
    });

    // Open display configuration
    ui.on_open_display_config({
        move || {
            // Placeholder for display configuration logic
            println!("Opening display configuration...");
        }
    });

    // Toggle audience screen
    ui.on_toggle_audience_screen({
        let ui_weak = ui_weak.clone();
        let app_state = app_state.clone();
        move |enabled| {
            if enabled {
                // In a real implementation, you'd spawn the audience screen process
                println!("Toggling audience screen: {}", enabled);
                update_audience_screen(&ui_weak, &app_state);
            }
        }
    });

    // Toggle confidence monitor
    ui.on_toggle_confidence_monitor({
        let ui_weak = ui_weak.clone();
        let app_state = app_state.clone();
        move |enabled| {
            if enabled {
                println!("Toggling confidence monitor: {}", enabled);
                update_confidence_monitor(&ui_weak, &app_state);
            }
        }
    });

    ui.run()
}

fn update_audience_screen(ui_weak: &slint::Weak<MainWindow>, app_state: &Rc<RefCell<AppState>>) {
    let state = app_state.borrow();
    if !state.current_slides.is_empty() {
        if let Some(slide) = state.current_slides.get(state.current_slide_idx) {
            // Send update to audience screen via TCP
            send_audience_update("", &slide.lines[0], &slide.lines[1]);
            
            // Update UI with fade effect
            if let Some(ui) = ui_weak.upgrade() {
                ui.set_current_slide_line1(SharedString::from(slide.lines[0].clone()));
                ui.set_current_slide_line2(SharedString::from(slide.lines[1].clone()));
                ui.set_slide_opacity(0.0);
                
                // Fade in after short delay
                slint::Timer::single_shot(Duration::from_millis(200), {
                    let ui_weak = ui_weak.clone();
                    move || {
                        if let Some(ui) = ui_weak.upgrade() {
                            ui.set_slide_opacity(1.0);
                        }
                    }
                });
            }
        }
    }
}

fn update_confidence_monitor(ui_weak: &slint::Weak<MainWindow>, app_state: &Rc<RefCell<AppState>>) {
    let state = app_state.borrow();
    if let Some(ui) = ui_weak.upgrade() {
        // Current slide
        if let Some(current_slide) = state.current_slides.get(state.current_slide_idx) {
            ui.set_confidence_current_line1(SharedString::from(current_slide.lines[0].clone()));
            ui.set_confidence_current_line2(SharedString::from(current_slide.lines[1].clone()));
        }
        
        // Next slide
        if let Some(next_slide) = state.current_slides.get(state.current_slide_idx + 1) {
            ui.set_confidence_next_line1(SharedString::from(next_slide.lines[0].clone()));
            ui.set_confidence_next_line2(SharedString::from(next_slide.lines[1].clone()));
        } else {
            ui.set_confidence_next_line1(SharedString::from(""));
            ui.set_confidence_next_line2(SharedString::from(""));
        }
        
        // Clock
        let now = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let hours = (now / 3600) % 24;
        let minutes = (now % 3600) / 60;
        ui.set_confidence_clock(SharedString::from(format!("{:02}:{:02}", hours, minutes)));
        
        // Countdown (if audio is playing)
        if let Some(start_time) = state.start_time {
            let elapsed = SystemTime::now()
                .duration_since(start_time)
                .unwrap()
                .as_secs();
            let minutes = elapsed / 60;
            let seconds = elapsed % 60;
            ui.set_confidence_countdown(SharedString::from(format!("{:02}:{:02}", minutes, seconds)));
        } else {
            ui.set_confidence_countdown(SharedString::from("--:--"));
        }
        
        // Content type indicator
        let content_type = match state.current_content_type {
            ContentType::Song => "Song",
            ContentType::BibleVerse => "Bible Verse", 
            ContentType::Media => "Media",
        };
        ui.set_content_type_indicator(SharedString::from(content_type));
    }
}

// Unit tests
#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{create_dir, File};
    use std::io::Write;
    use tempfile::tempdir;

    #[test]
    fn test_content_type_enum() {
        assert_eq!(ContentType::Song, ContentType::Song);
        assert_ne!(ContentType::Song, ContentType::BibleVerse);
        assert_ne!(ContentType::BibleVerse, ContentType::Media);
    }

    #[test]
    fn test_app_state_initialization() {
        let state = AppState {
            current_song: None,
            current_slides: Vec::new(),
            current_slide_idx: 0,
            current_content_type: ContentType::Song,
            audio_player: None,
            midi_input: None,
            midi_output: None,
            start_time: None,
            bible_use_case: FetchBibleVerseUseCase::new(None),
        };
        
        assert!(state.current_song.is_none());
        assert_eq!(state.current_slides.len(), 0);
        assert_eq!(state.current_slide_idx, 0);
        assert_eq!(state.current_content_type, ContentType::Song);
    }

    #[test]
    fn test_audience_update_serialization() {
        let update = AudienceUpdate {
            video_path: "/path/to/video.mp4".to_string(),
            line1: "First line".to_string(),
            line2: "Second line".to_string(),
        };
        
        let json = serde_json::to_string(&update).unwrap();
        assert!(json.contains("First line"));
        assert!(json.contains("Second line"));
        assert!(json.contains("/path/to/video.mp4"));
    }

    #[test]
    fn test_slide_navigation_bounds() {
        let slides = vec![
            DomainSlide { lines: ["Line 1".to_string(), "Line 2".to_string()] },
            DomainSlide { lines: ["Line 3".to_string(), "Line 4".to_string()] },
        ];
        
        let mut slide_idx = 0;
        
        // Test forward navigation
        if slide_idx < slides.len().saturating_sub(1) {
            slide_idx += 1;
        }
        assert_eq!(slide_idx, 1);
        
        // Test forward navigation at boundary
        if slide_idx < slides.len().saturating_sub(1) {
            slide_idx += 1;
        }
        assert_eq!(slide_idx, 1); // Should not go beyond last slide
        
        // Test backward navigation
        if slide_idx > 0 {
            slide_idx -= 1;
        }
        assert_eq!(slide_idx, 0);
        
        // Test backward navigation at boundary
        if slide_idx > 0 {
            slide_idx -= 1;
        }
        assert_eq!(slide_idx, 0); // Should not go below 0
    }

    #[test]
    fn test_integration_bible_verse_loading() {
        let bible_use_case = FetchBibleVerseUseCase::new(None);
        
        // Test validation
        assert!(bible_use_case.validate_reference("John 3:16").is_ok());
        assert!(bible_use_case.validate_reference("").is_err());
        
        // Test popular verses
        let popular = FetchBibleVerseUseCase::get_popular_verses();
        assert!(!popular.is_empty());
        assert!(popular.iter().any(|(ref_str, _)| *ref_str == "John 3:16"));
    }

    #[test]
    fn test_load_song_integration() {
        let dir = tempdir().unwrap();
        let song_folder = dir.path().join("TestSong");
        create_dir(&song_folder).unwrap();

        let lyrics_path = song_folder.join("lyrics.txt");
        let mut lyrics_file = File::create(&lyrics_path).unwrap();
        writeln!(lyrics_file, "Line one\nLine two").unwrap();

        let audio_path = song_folder.join("test.mp3");
        File::create(&audio_path).unwrap();

        let file_repo = FileRepository::new();
        let audio_repo = AudioRepository::new();
        let use_case = LoadSongUseCase::new(file_repo, audio_repo);

        let song = use_case.execute(&song_folder).unwrap();

        assert_eq!(song.name, "TestSong");
        assert_eq!(song.tracks.len(), 1);
        assert_eq!(song.slides.len(), 1);
        assert_eq!(song.slides[0].lines[0], "Line one");
        assert_eq!(song.slides[0].lines[1], "Line two");
        assert_eq!(song.tracks[0].name, "test");
        assert!(matches!(song.tracks[0].pan, DomainPan::Right));
        assert!(song.tracks[0].transpose);
    }
}
