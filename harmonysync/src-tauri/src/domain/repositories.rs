use super::entities::{Macro, ScheduleEvent, Setting, Slide, Song, Track, Presentation, YouTubeLink, DmxFixture, DmxScene, DmxSceneMacro};
use anyhow::Result;

pub trait SongRepository: Send + Sync + 'static {
    fn get_all(&self) -> Result<Vec<Song>>;
    fn get_by_id(&self, id: i64) -> Result<Option<Song>>;
    fn insert(&self, song: &Song) -> Result<Song>;
    fn update(&self, song: &Song) -> Result<()>;
    fn delete(&self, id: i64) -> Result<()>;
}

pub trait TrackRepository: Send + Sync + 'static {
    fn get_all_for_song(&self, song_id: i64) -> Result<Vec<Track>>;
    fn get_by_id(&self, id: i64) -> Result<Option<Track>>;
    fn insert(&self, track: &Track) -> Result<Track>;
    fn update(&self, track: &Track) -> Result<()>;
    fn delete(&self, id: i64) -> Result<()>;
}

pub trait MacroRepository: Send + Sync + 'static {
    fn get_all(&self) -> Result<Vec<Macro>>;
    fn get_by_id(&self, id: i64) -> Result<Option<Macro>>;
    fn insert(&self, mac: &Macro) -> Result<Macro>;
    fn update(&self, mac: &Macro) -> Result<()>;
    fn delete(&self, id: i64) -> Result<()>;
    fn get_for_slide(&self, slide_id: &str) -> Result<Vec<Macro>>;
    fn add_to_slide(&self, slide_id: &str, macro_id: i64) -> Result<()>;
    fn remove_from_slide(&self, slide_id: &str, macro_id: i64) -> Result<()>;
}

pub trait SettingRepository: Send + Sync + 'static {
    fn get(&self, key: &str) -> Result<Option<Setting>>;
    fn set(&self, setting: &Setting) -> Result<()>;
}

pub trait ScheduleRepository: Send + Sync + 'static {
    fn get_all(&self) -> Result<Vec<ScheduleEvent>>;
    fn get_by_id(&self, id: i64) -> Result<Option<ScheduleEvent>>;
    fn insert(&self, event: &ScheduleEvent) -> Result<ScheduleEvent>;
    fn update(&self, event: &ScheduleEvent) -> Result<()>;
    fn delete(&self, id: i64) -> Result<()>;
}

pub trait SlideRepository: Send + Sync + 'static {
    // For now, Slide operations are limited, but we can expand this.
    // The slide_macros table suggests slides are identified by an ID.
    fn get_by_id(&self, id: &str) -> Result<Option<Slide>>;
    // Potentially add methods to manage slide content or metadata if needed.
}

pub trait PresentationRepository: Send + Sync + 'static {
    fn insert(&self, presentation: &Presentation) -> Result<Presentation>;
    fn get_by_name(&self, name: &str) -> Result<Option<Presentation>>;
    fn get_all(&self) -> Result<Vec<Presentation>>;
    fn get_by_id(&self, id: i64) -> Result<Option<Presentation>>;
    fn update(&self, presentation: &Presentation) -> Result<()>;
    fn delete(&self, id: i64) -> Result<()>;
}

pub trait YouTubeLinkRepository: Send + Sync + 'static {
    fn insert(&self, link: &YouTubeLink) -> Result<YouTubeLink>;
    fn get_by_presentation_id(&self, presentation_id: i64) -> Result<Vec<YouTubeLink>>;
    fn delete_by_presentation_id(&self, presentation_id: i64) -> Result<()>;
}

pub trait DmxFixtureRepository: Send + Sync + 'static {
    fn get_all(&self) -> Result<Vec<DmxFixture>>;
    fn get_by_id(&self, id: &str) -> Result<Option<DmxFixture>>;
    fn insert(&self, fixture: &DmxFixture) -> Result<DmxFixture>;
    fn update(&self, fixture: &DmxFixture) -> Result<()>;
    fn delete(&self, id: &str) -> Result<()>;
}

pub trait DmxSceneRepository: Send + Sync + 'static {
    fn get_all(&self) -> Result<Vec<DmxScene>>;
    fn get_by_id(&self, id: &str) -> Result<Option<DmxScene>>;
    fn insert(&self, scene: &DmxScene) -> Result<DmxScene>;
    fn update(&self, scene: &DmxScene) -> Result<()>;
    fn delete(&self, id: &str) -> Result<()>;
    fn add_to_macro(&self, scene_id: &str, macro_id: i64) -> Result<()>;
    fn remove_from_macro(&self, scene_id: &str, macro_id: i64) -> Result<()>;
    fn get_for_macro(&self, macro_id: i64) -> Result<Vec<DmxScene>>;
}
