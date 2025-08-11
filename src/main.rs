// src/main.rs
use std::cell::RefCell;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use std::rc::Rc;
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};

use midir::{MidiInput, MidiOutput};
use rodio::{OutputStream, Sink, Source};
use slint::{Model, SharedString, VecModel};

use crate::application::use_cases::LoadSongUseCase;
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
    current_slide_idx: usize,
    audio_player: Option<AudioPlayer>,
    midi_input: Option<MidiInput>,
    midi_output: Option<MidiOutput>,
    start_time: Option<SystemTime>,
}

fn main() -> Result<(), slint::PlatformError> {
    let ui = MainWindow::new()?;
    let app_state: Rc<RefCell<AppState>> = Rc::new(RefCell::new(AppState {
        current_song: None,
        current_slide_idx: 0,
        audio_player: None,
        midi_input: None,
        midi_output: None,
        start_time: None,
    }));
    let library_path: Rc<RefCell<Option<PathBuf>>> = Rc::new(RefCell::new(None));
    let setlist_model: Rc<VecModel<SharedString>> = Rc::new(VecModel::default());
    ui.set_setlist_model(setlist_model.clone().into());

    let ui_weak = ui.as_weak();

    // Initialize MIDI
    let midi_in = MidiInput::new("SlingPresenterInput")?;
    let midi_out = MidiOutput::new("SlingPresenterOutput")?;
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
                        state.current_song = Some(domain_song);
                        state.current_slide_idx = 0;
                    }

                    ui_weak.upgrade().unwrap().set_current_song(slint_song);
                    update_audience_screen(&ui_weak, &app_state);
                    update_confidence_monitor(&ui_weak, &app_state);
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

    // Next slide
    ui.on_next_slide({
        let app_state = app_state.clone();
        let ui_weak = ui_weak.clone();
        move || {
            let mut state = app_state.borrow_mut();
            if let Some(song) = &state.current_song {
                if state.current_slide_idx < song.slides.len().saturating_sub(1) {
                    state.current_slide_idx += 1;
                    update_audience_screen(&ui_weak, &app_state);
                    update_confidence_monitor(&ui_weak, &app_state);
                }
            }
        }
    });

    // Previous slide
    ui.on_previous_slide({
        let app_state = app_state.clone();
        let ui_weak = ui_weak.clone();
        move || {
            let mut state = app_state.borrow_mut();
            if state.current_slide_idx > 0 {
                state.current_slide_idx -= 1;
                update_audience_screen(&ui_weak, &app_state);
                update_confidence_monitor(&ui_weak, &app_state);
            }
        }
    });

    // Fetch Bible verse
    ui.on_fetch_bible_verse({
        let ui_weak = ui_weak.clone();
        move |reference, version| {
            let client = reqwest::blocking::Client::new();
            let url = format!("https://api.bible.com/v1/verses/{}", reference);
            if let Ok(response) = client.get(&url).query(&[("version", version.as_str())]).send() {
                if let Ok(text) = response.text() {
                    ui_weak.upgrade().unwrap().set_verse_text(text.into());
                }
            }
        }
    });

    // Open display configuration
    ui.on_open_display_config({
        move || {
            // Placeholder for display configuration logic
        }
    });

    // Toggle audience screen
    ui.on_toggle_audience_screen({
        let ui_weak = ui_weak.clone();
        let app_state = app_state.clone();
        move |enabled| {
            if enabled {
                let audience = AudienceScreen::new().unwrap();
                update_audience_screen(&ui_weak, &app_state);
                audience.run().unwrap();
            }
        }
    });

    // Toggle confidence monitor
    ui.on_toggle_confidence_monitor({
        let ui_weak = ui_weak.clone();
        let app_state = app_state.clone();
        move |enabled| {
            if enabled {
                let confidence = ConfidenceMonitor::new().unwrap();
                update_confidence_monitor(&ui_weak, &app_state);
                confidence.run().unwrap();
            }
        }
    });

    ui.run()
}

fn update_audience_screen(ui_weak: &slint::Weak<MainWindow>, app_state: &Rc<RefCell<AppState>>) {
    let ui = ui_weak.upgrade().unwrap();
    let state = app_state.borrow();
    if let Some(song) = &state.current_song {
        if let Some(slide) = song.slides.get(state.current_slide_idx) {
            let audience = AudienceScreen::new().unwrap();
            audience.set_line1(slide.lines[0].clone().into());
            audience.set_line2(slide.lines[1].clone().into());
            audience.set_opacity(0.0);
            slint::Timer::single_shot(Duration::from_millis(200), move || {
                audience.set_opacity(1.0);
            });
        }
    }
}

fn update_confidence_monitor(ui_weak: &slint::Weak<MainWindow>, app_state: &Rc<RefCell<AppState>>) {
    let ui = ui_weak.upgrade().unwrap();
    let state = app_state.borrow();
    if let Some(song) = &state.current_song {
        let confidence = ConfidenceMonitor::new().unwrap();
        if let Some(current_slide) = song.slides.get(state.current_slide_idx) {
            confidence.set_current_line1(current_slide.lines[0].clone().into());
            confidence.set_current_line2(current_slide.lines[1].clone().into());
        }
        if let Some(next_slide) = song.slides.get(state.current_slide_idx + 1) {
            confidence.set_next_line1(next_slide.lines[0].clone().into());
            confidence.set_next_line2(next_slide.lines[1].clone().into());
        }
        let clock = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        confidence.set_clock(format!("{:02}:{:02}", clock / 3600, (clock % 3600) / 60).into());
        if let Some(start_time) = state.start_time {
            let countdown = SystemTime::now()
                .duration_since(start_time)
                .unwrap()
                .as_secs();
            confidence.set_countdown(format!("{:02}:{:02}", countdown / 60, countdown % 60).into());
        }
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

    #[test]
    fn test_slide_navigation() {
        let mut app_state = AppState {
            current_song: Some(DomainSong {
                name: "Test".to_string(),
                tracks: vec![],
                slides: vec![
                    DomainSlide { lines: ["Line 1".to_string(), "Line 2".to_string()] },
                    DomainSlide { lines: ["Line 3".to_string(), "Line 4".to_string()] },
                ],
                metronome: false,
                config: MixerConfig {
                    transpose_semitones: 0,
                    low_cut: 20.0,
                    high_cut: 20000.0,
                    limiter_threshold: -6.0,
                },
            }),
            current_slide_idx: 0,
            audio_player: None,
            midi_input: None,
            midi_output: None,
            start_time: None,
        };

        assert_eq!(app_state.current_slide_idx, 0);
        app_state.current_slide_idx += 1;
        assert_eq!(app_state.current_slide_idx, 1);
        app_state.current_slide_idx = app_state.current_slide_idx.saturating_sub(1);
        assert_eq!(app_state.current_slide_idx, 0);
    }
}