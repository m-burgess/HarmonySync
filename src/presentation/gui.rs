use slint::{ModelRc, SharedString, VecModel, Weak, ComponentHandle, Callback};
use crate::domain::entities::{Track, Pan, MixerConfig};
use crate::infrastructure::audio::MultiTrackPlayer;

// Define a struct matching TrackData in Slint
#[derive(Clone, slint::slint_struct)]
pub struct TrackData {
    pub name: SharedString,
    pub volume: f32,
    pub pan: i32, // 0=L, 1=C, 2=R
    pub mute: bool,
    pub solo: bool,
    pub transpose: bool,
}

// Convert from domain Track to UI TrackData
impl From<&Track> for TrackData {
    fn from(track: &Track) -> Self {
        Self {
            name: SharedString::from(track.name.clone()),
            volume: track.volume,
            pan: match track.pan {
                Pan::Left => 0,
                Pan::Center => 1,
                Pan::Right => 2,
            },
            mute: track.mute,
            solo: track.solo,
            transpose: track.transpose,
        }
    }
}

// Convert from UI TrackData to domain Track
impl From<&TrackData> for Track {
    fn from(data: &TrackData) -> Self {
        Self {
            name: data.name.to_string(),
            path: std::path::PathBuf::new(), // Set this as needed
            volume: data.volume,
            pan: match data.pan {
                0 => Pan::Left,
                1 => Pan::Center,
                2 => Pan::Right,
                _ => Pan::Center,
            },
            mute: data.mute,
            solo: data.solo,
            transpose: data.transpose,
        }
    }
}

// Example function to populate the UI with tracks from a Song
pub fn set_tracks_to_ui(ui: &Weak<ComponentHandle>, tracks: &[Track]) {
    let track_data: Vec<TrackData> = tracks.iter().map(TrackData::from).collect();
    if let Some(handle) = ui.upgrade() {
        handle.set_property("tracks", track_data);
    }
}

// Example function to read tracks from UI and update domain model
pub fn get_tracks_from_ui(ui: &Weak<ComponentHandle>) -> Vec<Track> {
    if let Some(handle) = ui.upgrade() {
        let track_data: Vec<TrackData> = handle.get_property("tracks");
        track_data.iter().map(Track::from).collect()
    } else {
        vec![]
    }
}

/// Connects UI callbacks to audio engine controls.
pub fn connect_callbacks(
    ui: &slint::ComponentHandle,
    player: &mut MultiTrackPlayer,
    mixer_config: &mut MixerConfig,
) {
    // Play button
    let player_ptr = std::sync::Arc::new(std::sync::Mutex::new(player));
    let play_ptr = player_ptr.clone();
    ui.global::<slint::Global>("MainWindow").on("play", move || {
        let mut player = play_ptr.lock().unwrap();
        player.play();
    });

    // Stop button
    let stop_ptr = player_ptr.clone();
    ui.global::<slint::Global>("MainWindow").on("stop", move || {
        let mut player = stop_ptr.lock().unwrap();
        player.stop();
    });

    // Metronome start
    let metronome_ptr = player_ptr.clone();
    ui.global::<slint::Global>("MainWindow").on("metronome_start", move |bpm: i32, beats: i32, note: i32| {
        let player = metronome_ptr.lock().unwrap();
        player.play_metronome(bpm as u32, beats as u32, note as u32);
    });

    // Metronome stop
    let metronome_stop_ptr = player_ptr.clone();
    ui.global::<slint::Global>("MainWindow").on("metronome_stop", move || {
        let player = metronome_stop_ptr.lock().unwrap();
        player.stop_metronome();
    });

    // Track fader, pan, mute, solo, transpose
    let update_tracks_ptr = player_ptr.clone();
    ui.global::<slint::Global>("MainWindow").on("tracks_changed", move |tracks: Vec<TrackData>| {
        let mut player = update_tracks_ptr.lock().unwrap();
        let updated_tracks: Vec<Track> = tracks.iter().map(Track::from).collect();
        player.load_tracks_with_transpose(&updated_tracks, mixer_config).ok();
    });

    // Master controls: transpose, limiter, filters
    let update_master_ptr = player_ptr.clone();
    ui.global::<slint::Global>("MainWindow").on("master_changed", move |transpose: i32, limiter: f32, low_cut: f32, high_cut: f32| {
        mixer_config.transpose_semitones = transpose;
        mixer_config.limiter_threshold = limiter;
        mixer_config.low_cut = low_cut;
        mixer_config.high_cut = high_cut;
        let mut player = update_master_ptr.lock().unwrap();
        // Reload tracks with new config
        // You may want to cache the last track list and reload here
    });
}

// Note: You must define the corresponding callbacks in your Slint .slint file, e.g.:
// callback play();
// callback stop();
// callback metronome_start(int bpm, int beats, int note);
// callback metronome_stop();
// callback tracks_changed([TrackData] tracks);
// callback master_changed(int transpose, float limiter, float low_cut, float