use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Song {
    pub id: Option<i64>,
    pub title: String,
    pub lyrics: Option<String>,
    pub mogg_file_path: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Track {
    pub id: Option<i64>,
    pub song_id: i64,
    pub file_path: String,
    pub track_name: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Macro {
    pub id: Option<i64>,
    pub name: String,
    pub action: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Setting {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ScheduleEvent {
    pub id: Option<i64>,
    pub event_time: String,
    pub event_type: String,
    pub target_id: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Slide {
    pub id: String,
    // Add other slide-specific fields here as they become clear
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Presentation {
    pub id: Option<i64>,
    pub name: String,
    pub path: String,
    pub category: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct YouTubeLink {
    pub id: Option<i64>,
    pub presentation_id: i64,
    pub url: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SongDetails {
    pub id: i64,
    pub title: String,
    pub lyrics: Option<String>,
    pub tracks: Vec<Track>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SongSearchResult {
    pub id: i64,
    pub title: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PresentationSearchResult {
    pub id: i64,
    pub name: String,
    pub path: String,
}

// DMX Entities
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DmxFixture {
    pub id: String,
    pub name: String,
    pub fixture_type: String,
    pub dmx_address: i32,
    pub universe: i32,
    pub channel_count: i32,
    pub channel_definitions: String, // JSON string for channel definitions
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DmxScene {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub fade_time_ms: i32,
    pub scene_data: String, // JSON string for scene data (fixture values)
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DmxSceneMacro {
    pub scene_id: String,
    pub macro_id: i64,
}

// Song Import Entities
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PlanningCenterSong {
    pub id: String,
    pub title: String,
    pub author: Option<String>,
    pub ccli_number: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SongLyricsRequest {
    pub title: String,
    pub artist: Option<String>,
    pub ccli: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SongLyricsResult {
    pub title: String,
    pub lyrics: String,
    pub source: String, // "songselect", "musixmatch", "genius", etc.
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ImportedSong {
    pub title: String,
    pub lyrics: String,
    pub file_path: String,
}
