use app_lib::domain::entities::*;
use app_lib::domain::repositories::*;
use app_lib::infrastructure::sqlite_repository::SqliteRepository;
use rusqlite::Connection;

fn create_test_repository() -> SqliteRepository {
    let conn = Connection::open_in_memory().unwrap();
    let repo = SqliteRepository::new(conn);
    repo.init_database().unwrap();
    repo
}

#[cfg(test)]
mod database_initialization_tests {
    use super::*;

    #[test]
    fn test_init_database_creates_tables() {
        let repo = create_test_repository();
        
        // Verify tables exist by querying them
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        let test_repo = SqliteRepository::new(conn);
        
        // Should not panic when initializing
        assert!(test_repo.init_database().is_ok());
    }

    #[test]
    fn test_init_database_is_idempotent() {
        let repo = create_test_repository();
        
        // Should be able to call init_database multiple times without error
        assert!(repo.init_database().is_ok());
        assert!(repo.init_database().is_ok());
    }
}

#[cfg(test)]
mod song_repository_tests {
    use super::*;

    #[test]
    fn test_insert_song() {
        let repo = create_test_repository();
        
        let song = Song {
            id: None,
            title: "Test Song".to_string(),
            lyrics: Some("Test lyrics".to_string()),
        };

        let result = repo.insert(&song);
        assert!(result.is_ok());
        
        let inserted = result.unwrap();
        assert!(inserted.id.is_some());
        assert_eq!(inserted.title, "Test Song");
    }

    #[test]
    fn test_get_all_songs_empty() {
        let repo = create_test_repository();
        
        let songs = repo.get_all().unwrap();
        assert_eq!(songs.len(), 0);
    }

    #[test]
    fn test_get_all_songs() {
        let repo = create_test_repository();
        
        let song1 = Song {
            id: None,
            title: "Song 1".to_string(),
            lyrics: Some("Lyrics 1".to_string()),
        };
        
        let song2 = Song {
            id: None,
            title: "Song 2".to_string(),
            lyrics: Some("Lyrics 2".to_string()),
        };

        repo.insert(&song1).unwrap();
        repo.insert(&song2).unwrap();

        let songs = repo.get_all().unwrap();
        assert_eq!(songs.len(), 2);
    }

    #[test]
    fn test_get_song_by_id() {
        let repo = create_test_repository();
        
        let song = Song {
            id: None,
            title: "Test Song".to_string(),
            lyrics: Some("Test lyrics".to_string()),
        };

        let inserted = repo.insert(&song).unwrap();
        let id = inserted.id.unwrap();

        let retrieved = repo.get_by_id(id).unwrap();
        assert!(retrieved.is_some());
        
        let retrieved_song = retrieved.unwrap();
        assert_eq!(retrieved_song.id, Some(id));
        assert_eq!(retrieved_song.title, "Test Song");
    }

    #[test]
    fn test_get_song_by_nonexistent_id() {
        let repo = create_test_repository();
        
        let result = repo.get_by_id(999).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_update_song() {
        let repo = create_test_repository();
        
        let song = Song {
            id: None,
            title: "Original Title".to_string(),
            lyrics: Some("Original lyrics".to_string()),
        };

        let inserted = repo.insert(&song).unwrap();
        let id = inserted.id.unwrap();

        let updated_song = Song {
            id: Some(id),
            title: "Updated Title".to_string(),
            lyrics: Some("Updated lyrics".to_string()),
        };

        assert!(repo.update(&updated_song).is_ok());

        let retrieved = repo.get_by_id(id).unwrap().unwrap();
        assert_eq!(retrieved.title, "Updated Title");
        assert_eq!(retrieved.lyrics, Some("Updated lyrics".to_string()));
    }

    #[test]
    fn test_delete_song() {
        let repo = create_test_repository();
        
        let song = Song {
            id: None,
            title: "To Delete".to_string(),
            lyrics: Some("Will be deleted".to_string()),
        };

        let inserted = repo.insert(&song).unwrap();
        let id = inserted.id.unwrap();

        assert!(repo.delete(id).is_ok());

        let retrieved = repo.get_by_id(id).unwrap();
        assert!(retrieved.is_none());
    }

    #[test]
    fn test_insert_duplicate_title_fails() {
        let repo = create_test_repository();
        
        let song1 = Song {
            id: None,
            title: "Duplicate".to_string(),
            lyrics: Some("First".to_string()),
        };

        let song2 = Song {
            id: None,
            title: "Duplicate".to_string(),
            lyrics: Some("Second".to_string()),
        };

        repo.insert(&song1).unwrap();
        let result = repo.insert(&song2);
        
        assert!(result.is_err(), "Should fail when inserting duplicate title");
    }
}

#[cfg(test)]
mod track_repository_tests {
    use super::*;

    #[test]
    fn test_insert_track() {
        let repo = create_test_repository();
        
        // First insert a song
        let song = Song {
            id: None,
            title: "Test Song".to_string(),
            lyrics: None,
        };
        let inserted_song = repo.insert(&song).unwrap();
        let song_id = inserted_song.id.unwrap();

        let track = Track {
            id: None,
            song_id,
            file_path: "/path/to/track.ogg".to_string(),
            track_name: Some("Lead Vocal".to_string()),
        };

        let result = repo.insert(&track);
        assert!(result.is_ok());
        
        let inserted = result.unwrap();
        assert!(inserted.id.is_some());
    }

    #[test]
    fn test_get_all_tracks_for_song() {
        let repo = create_test_repository();
        
        // Insert a song
        let song = Song {
            id: None,
            title: "Test Song".to_string(),
            lyrics: None,
        };
        let inserted_song = repo.insert(&song).unwrap();
        let song_id = inserted_song.id.unwrap();

        // Insert tracks
        let track1 = Track {
            id: None,
            song_id,
            file_path: "/track1.ogg".to_string(),
            track_name: Some("Vocals".to_string()),
        };

        let track2 = Track {
            id: None,
            song_id,
            file_path: "/track2.ogg".to_string(),
            track_name: Some("Guitar".to_string()),
        };

        repo.insert(&track1).unwrap();
        repo.insert(&track2).unwrap();

        let tracks = repo.get_all_for_song(song_id).unwrap();
        assert_eq!(tracks.len(), 2);
    }

    #[test]
    fn test_delete_track() {
        let repo = create_test_repository();
        
        let song = Song {
            id: None,
            title: "Test Song".to_string(),
            lyrics: None,
        };
        let inserted_song = repo.insert(&song).unwrap();
        let song_id = inserted_song.id.unwrap();

        let track = Track {
            id: None,
            song_id,
            file_path: "/track.ogg".to_string(),
            track_name: Some("Test".to_string()),
        };

        let inserted_track = repo.insert(&track).unwrap();
        let track_id = inserted_track.id.unwrap();

        assert!(repo.delete(track_id).is_ok());

        let retrieved = repo.get_by_id(track_id).unwrap();
        assert!(retrieved.is_none());
    }
}

#[cfg(test)]
mod presentation_repository_tests {
    use super::*;

    #[test]
    fn test_insert_presentation() {
        let repo = create_test_repository();
        
        let presentation = Presentation {
            id: None,
            name: "Sunday Service".to_string(),
            path: "/presentations/sunday".to_string(),
            category: "Sermon".to_string(),
        };

        let result = repo.insert(&presentation);
        assert!(result.is_ok());
        
        let inserted = result.unwrap();
        assert!(inserted.id.is_some());
    }

    #[test]
    fn test_get_presentation_by_name() {
        let repo = create_test_repository();
        
        let presentation = Presentation {
            id: None,
            name: "Test Presentation".to_string(),
            path: "/test".to_string(),
            category: "Test".to_string(),
        };

        repo.insert(&presentation).unwrap();

        let retrieved = repo.get_by_name("Test Presentation").unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().name, "Test Presentation");
    }

    #[test]
    fn test_get_all_presentations() {
        let repo = create_test_repository();
        
        let pres1 = Presentation {
            id: None,
            name: "Presentation 1".to_string(),
            path: "/pres1".to_string(),
            category: "Cat1".to_string(),
        };

        let pres2 = Presentation {
            id: None,
            name: "Presentation 2".to_string(),
            path: "/pres2".to_string(),
            category: "Cat2".to_string(),
        };

        repo.insert(&pres1).unwrap();
        repo.insert(&pres2).unwrap();

        let presentations = repo.get_all().unwrap();
        assert_eq!(presentations.len(), 2);
    }

    #[test]
    fn test_update_presentation() {
        let repo = create_test_repository();
        
        let presentation = Presentation {
            id: None,
            name: "Original".to_string(),
            path: "/original".to_string(),
            category: "Cat1".to_string(),
        };

        let inserted = repo.insert(&presentation).unwrap();
        let id = inserted.id.unwrap();

        let updated = Presentation {
            id: Some(id),
            name: "Updated".to_string(),
            path: "/updated".to_string(),
            category: "Cat2".to_string(),
        };

        assert!(repo.update(&updated).is_ok());

        let retrieved = repo.get_by_id(id).unwrap().unwrap();
        assert_eq!(retrieved.name, "Updated");
    }

    #[test]
    fn test_delete_presentation() {
        let repo = create_test_repository();
        
        let presentation = Presentation {
            id: None,
            name: "To Delete".to_string(),
            path: "/delete".to_string(),
            category: "Test".to_string(),
        };

        let inserted = repo.insert(&presentation).unwrap();
        let id = inserted.id.unwrap();

        assert!(repo.delete(id).is_ok());

        let retrieved = repo.get_by_id(id).unwrap();
        assert!(retrieved.is_none());
    }
}

#[cfg(test)]
mod setting_repository_tests {
    use super::*;

    #[test]
    fn test_set_and_get_setting() {
        let repo = create_test_repository();
        
        let setting = Setting {
            key: "volume".to_string(),
            value: "80".to_string(),
        };

        assert!(repo.set(&setting).is_ok());

        let retrieved = repo.get("volume").unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().value, "80");
    }

    #[test]
    fn test_update_existing_setting() {
        let repo = create_test_repository();
        
        let setting1 = Setting {
            key: "theme".to_string(),
            value: "light".to_string(),
        };

        let setting2 = Setting {
            key: "theme".to_string(),
            value: "dark".to_string(),
        };

        repo.set(&setting1).unwrap();
        repo.set(&setting2).unwrap();

        let retrieved = repo.get("theme").unwrap();
        assert_eq!(retrieved.unwrap().value, "dark");
    }

    #[test]
    fn test_get_nonexistent_setting() {
        let repo = create_test_repository();
        
        let result = repo.get("nonexistent").unwrap();
        assert!(result.is_none());
    }
}

#[cfg(test)]
mod macro_repository_tests {
    use super::*;

    #[test]
    fn test_insert_macro() {
        let repo = create_test_repository();
        
        let macro_entity = Macro {
            id: None,
            name: "Fade In".to_string(),
            action: "fade_in_500ms".to_string(),
        };

        let result = repo.insert(&macro_entity);
        assert!(result.is_ok());
    }

    #[test]
    fn test_get_all_macros() {
        let repo = create_test_repository();
        
        let macro1 = Macro {
            id: None,
            name: "Macro 1".to_string(),
            action: "action1".to_string(),
        };

        let macro2 = Macro {
            id: None,
            name: "Macro 2".to_string(),
            action: "action2".to_string(),
        };

        repo.insert(&macro1).unwrap();
        repo.insert(&macro2).unwrap();

        let macros = repo.get_all().unwrap();
        assert_eq!(macros.len(), 2);
    }
}

#[cfg(test)]
mod schedule_repository_tests {
    use super::*;

    #[test]
    fn test_insert_schedule_event() {
        let repo = create_test_repository();
        
        let event = ScheduleEvent {
            id: None,
            event_time: "2024-10-14T10:00:00".to_string(),
            event_type: "song_start".to_string(),
            target_id: "song_123".to_string(),
        };

        let result = repo.insert(&event);
        assert!(result.is_ok());
    }

    #[test]
    fn test_get_all_schedule_events() {
        let repo = create_test_repository();
        
        let event1 = ScheduleEvent {
            id: None,
            event_time: "2024-10-14T10:00:00".to_string(),
            event_type: "song_start".to_string(),
            target_id: "song_1".to_string(),
        };

        let event2 = ScheduleEvent {
            id: None,
            event_time: "2024-10-14T11:00:00".to_string(),
            event_type: "song_end".to_string(),
            target_id: "song_2".to_string(),
        };

        repo.insert(&event1).unwrap();
        repo.insert(&event2).unwrap();

        let events = repo.get_all().unwrap();
        assert_eq!(events.len(), 2);
    }

    #[test]
    fn test_delete_schedule_event() {
        let repo = create_test_repository();
        
        let event = ScheduleEvent {
            id: None,
            event_time: "2024-10-14T10:00:00".to_string(),
            event_type: "test".to_string(),
            target_id: "test".to_string(),
        };

        let inserted = repo.insert(&event).unwrap();
        let id = inserted.id.unwrap();

        assert!(repo.delete(id).is_ok());

        let retrieved = repo.get_by_id(id).unwrap();
        assert!(retrieved.is_none());
    }
}

#[cfg(test)]
mod youtube_link_repository_tests {
    use super::*;

    #[test]
    fn test_insert_youtube_link() {
        let repo = create_test_repository();
        
        // First create a presentation
        let presentation = Presentation {
            id: None,
            name: "Test Presentation".to_string(),
            path: "/test".to_string(),
            category: "Test".to_string(),
        };
        let inserted_pres = repo.insert(&presentation).unwrap();
        let pres_id = inserted_pres.id.unwrap();

        let link = YouTubeLink {
            id: None,
            presentation_id: pres_id,
            url: "https://youtube.com/watch?v=test".to_string(),
        };

        let result = repo.insert(&link);
        assert!(result.is_ok());
    }

    #[test]
    fn test_get_links_by_presentation_id() {
        let repo = create_test_repository();
        
        let presentation = Presentation {
            id: None,
            name: "Test Presentation".to_string(),
            path: "/test".to_string(),
            category: "Test".to_string(),
        };
        let inserted_pres = repo.insert(&presentation).unwrap();
        let pres_id = inserted_pres.id.unwrap();

        let link1 = YouTubeLink {
            id: None,
            presentation_id: pres_id,
            url: "https://youtube.com/watch?v=1".to_string(),
        };

        let link2 = YouTubeLink {
            id: None,
            presentation_id: pres_id,
            url: "https://youtube.com/watch?v=2".to_string(),
        };

        repo.insert(&link1).unwrap();
        repo.insert(&link2).unwrap();

        let links = repo.get_by_presentation_id(pres_id).unwrap();
        assert_eq!(links.len(), 2);
    }

    #[test]
    fn test_delete_links_by_presentation_id() {
        let repo = create_test_repository();
        
        let presentation = Presentation {
            id: None,
            name: "Test Presentation".to_string(),
            path: "/test".to_string(),
            category: "Test".to_string(),
        };
        let inserted_pres = repo.insert(&presentation).unwrap();
        let pres_id = inserted_pres.id.unwrap();

        let link = YouTubeLink {
            id: None,
            presentation_id: pres_id,
            url: "https://youtube.com/watch?v=test".to_string(),
        };

        repo.insert(&link).unwrap();

        assert!(repo.delete_by_presentation_id(pres_id).is_ok());

        let links = repo.get_by_presentation_id(pres_id).unwrap();
        assert_eq!(links.len(), 0);
    }
}
