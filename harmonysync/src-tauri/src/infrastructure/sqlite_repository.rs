use crate::domain::entities::{Macro, ScheduleEvent, Setting, Slide, Song, Track, Presentation, YouTubeLink};
use crate::domain::repositories::{MacroRepository, ScheduleRepository, SettingRepository, SlideRepository, SongRepository, TrackRepository, PresentationRepository, YouTubeLinkRepository};
use anyhow::Result;
use rusqlite::{Connection, params, OptionalExtension};
use std::sync::Mutex;

pub struct SqliteRepository {
    conn: Mutex<Connection>,
}

impl SqliteRepository {
    pub fn new(conn: Connection) -> Self {
        SqliteRepository { conn: Mutex::new(conn) }
    }

    pub fn init_database(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "CREATE TABLE IF NOT EXISTS songs (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL UNIQUE,
                lyrics TEXT
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS tracks (
                id INTEGER PRIMARY KEY,
                song_id INTEGER NOT NULL,
                file_path TEXT NOT NULL,
                track_name TEXT,
                FOREIGN KEY (song_id) REFERENCES songs (id)
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS macros (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                action TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS slide_macros (
                slide_id TEXT NOT NULL,
                macro_id INTEGER NOT NULL,
                PRIMARY KEY (slide_id, macro_id),
                FOREIGN KEY (macro_id) REFERENCES macros (id)
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS schedule (
                id INTEGER PRIMARY KEY,
                event_time TEXT NOT NULL,
                event_type TEXT NOT NULL,
                target_id TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS presentations (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                path TEXT NOT NULL,
                category TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS youtube_links (
                id INTEGER PRIMARY KEY,
                presentation_id INTEGER NOT NULL,
                url TEXT NOT NULL,
                FOREIGN KEY (presentation_id) REFERENCES presentations (id) ON DELETE CASCADE
            )",
            [],
        )?;

        Ok(())
    }
}

impl SongRepository for SqliteRepository {
    fn get_all(&self) -> Result<Vec<Song>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, title, lyrics FROM songs")?;
        let song_iter = stmt.query_map([], |row| {
            Ok(Song {
                id: row.get(0)?,
                title: row.get(1)?,
                lyrics: row.get(2)?,
            })
        })?;

        let mut songs = Vec::new();
        for song in song_iter {
            songs.push(song?);
        }
        Ok(songs)
    }

    fn get_by_id(&self, id: i64) -> Result<Option<Song>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, title, lyrics FROM songs WHERE id = ?1")?;
        let song = stmt.query_row(params![id], |row| {
            Ok(Song {
                id: row.get(0)?,
                title: row.get(1)?,
                lyrics: row.get(2)?,
            })
        }).optional()?;
        Ok(song)
    }

    fn insert(&self, song: &Song) -> Result<Song> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO songs (title, lyrics) VALUES (?1, ?2)",
            params![song.title, song.lyrics],
        )?;
        let last_id = conn.last_insert_rowid();
        Ok(Song { id: Some(last_id), ..song.clone() })
    }

    fn update(&self, song: &Song) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE songs SET title = ?1, lyrics = ?2 WHERE id = ?3",
            params![song.title, song.lyrics, song.id],
        )?;
        Ok(())
    }

    fn delete(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM songs WHERE id = ?1", params![id])?;
        Ok(())
    }
}

impl PresentationRepository for SqliteRepository {
    fn insert(&self, presentation: &Presentation) -> Result<Presentation> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO presentations (name, path, category) VALUES (?1, ?2, ?3)",
            params![presentation.name, presentation.path, presentation.category],
        )?;
        let last_id = conn.last_insert_rowid();
        Ok(Presentation { id: Some(last_id), ..presentation.clone() })
    }

    fn get_by_name(&self, name: &str) -> Result<Option<Presentation>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, path, category FROM presentations WHERE name = ?1")?;
        let presentation = stmt.query_row(params![name], |row| {
            Ok(Presentation {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                category: row.get(3)?,
            })
        }).optional()?;
        Ok(presentation)
    }

    fn get_all(&self) -> Result<Vec<Presentation>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, path, category FROM presentations")?;
        let presentation_iter = stmt.query_map([], |row| {
            Ok(Presentation {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                category: row.get(3)?,
            })
        })?;

        let mut presentations = Vec::new();
        for presentation in presentation_iter {
            presentations.push(presentation?);
        }
        Ok(presentations)
    }

    fn get_by_id(&self, id: i64) -> Result<Option<Presentation>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, path, category FROM presentations WHERE id = ?1")?;
        let presentation = stmt.query_row(params![id], |row| {
            Ok(Presentation {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                category: row.get(3)?,
            })
        }).optional()?;
        Ok(presentation)
    }

    fn update(&self, presentation: &Presentation) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE presentations SET name = ?1, path = ?2, category = ?3 WHERE id = ?4",
            params![presentation.name, presentation.path, presentation.category, presentation.id],
        )?;
        Ok(())
    }

    fn delete(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM presentations WHERE id = ?1", params![id])?;
        Ok(())
    }
}

impl YouTubeLinkRepository for SqliteRepository {
    fn insert(&self, link: &YouTubeLink) -> Result<YouTubeLink> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO youtube_links (presentation_id, url) VALUES (?1, ?2)",
            params![link.presentation_id, link.url],
        )?;
        let last_id = conn.last_insert_rowid();
        Ok(YouTubeLink { id: Some(last_id), ..link.clone() })
    }

    fn get_by_presentation_id(&self, presentation_id: i64) -> Result<Vec<YouTubeLink>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, presentation_id, url FROM youtube_links WHERE presentation_id = ?1")?;
        let link_iter = stmt.query_map(params![presentation_id], |row| {
            Ok(YouTubeLink {
                id: row.get(0)?,
                presentation_id: row.get(1)?,
                url: row.get(2)?,
            })
        })?;

        let mut links = Vec::new();
        for link in link_iter {
            links.push(link?);
        }
        Ok(links)
    }

    fn delete_by_presentation_id(&self, presentation_id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM youtube_links WHERE presentation_id = ?1", params![presentation_id])?;
        Ok(())
    }
}

impl TrackRepository for SqliteRepository {
    fn get_all_for_song(&self, song_id: i64) -> Result<Vec<Track>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, song_id, file_path, track_name FROM tracks WHERE song_id = ?1")?;
        let track_iter = stmt.query_map(params![song_id], |row| {
            Ok(Track {
                id: row.get(0)?,
                song_id: row.get(1)?,
                file_path: row.get(2)?,
                track_name: row.get(3)?,
            })
        })?;

        let mut tracks = Vec::new();
        for track in track_iter {
            tracks.push(track?);
        }
        Ok(tracks)
    }

    fn get_by_id(&self, id: i64) -> Result<Option<Track>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, song_id, file_path, track_name FROM tracks WHERE id = ?1")?;
        let track = stmt.query_row(params![id], |row| {
            Ok(Track {
                id: row.get(0)?,
                song_id: row.get(1)?,
                file_path: row.get(2)?,
                track_name: row.get(3)?,
            })
        }).optional()?;
        Ok(track)
    }

    fn insert(&self, track: &Track) -> Result<Track> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO tracks (song_id, file_path, track_name) VALUES (?1, ?2, ?3)",
            params![track.song_id, track.file_path, track.track_name],
        )?;
        let last_id = conn.last_insert_rowid();
        Ok(Track { id: Some(last_id), ..track.clone() })
    }

    fn update(&self, track: &Track) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE tracks SET song_id = ?1, file_path = ?2, track_name = ?3 WHERE id = ?4",
            params![track.song_id, track.file_path, track.track_name, track.id],
        )?;
        Ok(())
    }

    fn delete(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM tracks WHERE id = ?1", params![id])?;
        Ok(())
    }
}

impl MacroRepository for SqliteRepository {
    fn get_all(&self) -> Result<Vec<Macro>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, action FROM macros")?;
        let macro_iter = stmt.query_map([], |row| {
            Ok(Macro {
                id: row.get(0)?,
                name: row.get(1)?,
                action: row.get(2)?,
            })
        })?;

        let mut macros = Vec::new();
        for mac in macro_iter {
            macros.push(mac?);
        }
        Ok(macros)
    }

    fn get_by_id(&self, id: i64) -> Result<Option<Macro>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, action FROM macros WHERE id = ?1")?;
        let mac = stmt.query_row(params![id], |row| {
            Ok(Macro {
                id: row.get(0)?,
                name: row.get(1)?,
                action: row.get(2)?,
            })
        }).optional()?;
        Ok(mac)
    }

    fn insert(&self, mac: &Macro) -> Result<Macro> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO macros (name, action) VALUES (?1, ?2)",
            params![mac.name, mac.action],
        )?;
        let last_id = conn.last_insert_rowid();
        Ok(Macro { id: Some(last_id), ..mac.clone() })
    }

    fn update(&self, mac: &Macro) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE macros SET name = ?1, action = ?2 WHERE id = ?3",
            params![mac.name, mac.action, mac.id],
        )?;
        Ok(())
    }

    fn delete(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM macros WHERE id = ?1", params![id])?;
        Ok(())
    }

    fn get_for_slide(&self, slide_id: &str) -> Result<Vec<Macro>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT m.id, m.name, m.action FROM macros m INNER JOIN slide_macros sm ON m.id = sm.macro_id WHERE sm.slide_id = ?1"
        )?;
        let macro_iter = stmt.query_map(params![slide_id], |row| {
            Ok(Macro {
                id: row.get(0)?,
                name: row.get(1)?,
                action: row.get(2)?,
            })
        })?;

        let mut macros = Vec::new();
        for mac in macro_iter {
            macros.push(mac?);
        }
        Ok(macros)
    }

    fn add_to_slide(&self, slide_id: &str, macro_id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO slide_macros (slide_id, macro_id) VALUES (?1, ?2)",
            params![slide_id, macro_id],
        )?;
        Ok(())
    }

    fn remove_from_slide(&self, slide_id: &str, macro_id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM slide_macros WHERE slide_id = ?1 AND macro_id = ?2",
            params![slide_id, macro_id],
        )?;
        Ok(())
    }
}

impl SettingRepository for SqliteRepository {
    fn get(&self, key: &str) -> Result<Option<Setting>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT key, value FROM settings WHERE key = ?1")?;
        let setting = stmt.query_row(params![key], |row| {
            Ok(Setting {
                key: row.get(0)?,
                value: row.get(1)?,
            })
        }).optional()?;
        Ok(setting)
    }

    fn set(&self, setting: &Setting) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![setting.key, setting.value],
        )?;
        Ok(())
    }
}

impl ScheduleRepository for SqliteRepository {
    fn get_all(&self) -> Result<Vec<ScheduleEvent>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, event_time, event_type, target_id FROM schedule")?;
        let event_iter = stmt.query_map([], |row| {
            Ok(ScheduleEvent {
                id: row.get(0)?,
                event_time: row.get(1)?,
                event_type: row.get(2)?,
                target_id: row.get(3)?,
            })
        })?;

        let mut events = Vec::new();
        for event in event_iter {
            events.push(event?);
        }
        Ok(events)
    }

    fn get_by_id(&self, id: i64) -> Result<Option<ScheduleEvent>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, event_time, event_type, target_id FROM schedule WHERE id = ?1")?;
        let event = stmt.query_row(params![id], |row| {
            Ok(ScheduleEvent {
                id: row.get(0)?,
                event_time: row.get(1)?,
                event_type: row.get(2)?,
                target_id: row.get(3)?,
            })
        }).optional()?;
        Ok(event)
    }

    fn insert(&self, event: &ScheduleEvent) -> Result<ScheduleEvent> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO schedule (event_time, event_type, target_id) VALUES (?1, ?2, ?3)",
            params![event.event_time, event.event_type, event.target_id],
        )?;
        let last_id = conn.last_insert_rowid();
        Ok(ScheduleEvent { id: Some(last_id), ..event.clone() })
    }

    fn update(&self, event: &ScheduleEvent) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE schedule SET event_time = ?1, event_type = ?2, target_id = ?3 WHERE id = ?4",
            params![event.event_time, event.event_type, event.target_id, event.id],
        )?;
        Ok(())
    }

    fn delete(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM schedule WHERE id = ?1", params![id])?;
        Ok(())
    }
}

impl SlideRepository for SqliteRepository {
    fn get_by_id(&self, id: &str) -> Result<Option<Slide>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT DISTINCT slide_id FROM slide_macros WHERE slide_id = ?1")?;
        let slide = stmt.query_row(params![id], |row| {
            Ok(Slide {
                id: row.get(0)?,
            })
        }).optional()?;
        Ok(slide)
    }
}
