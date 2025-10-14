use app_lib::domain::entities::*;

#[cfg(test)]
mod song_tests {
    use super::*;

    #[test]
    fn test_song_creation_with_all_fields() {
        let song = Song {
            id: Some(1),
            title: "Amazing Grace".to_string(),
            lyrics: Some("Amazing grace how sweet the sound".to_string()),
        };

        assert_eq!(song.id, Some(1));
        assert_eq!(song.title, "Amazing Grace");
        assert_eq!(song.lyrics, Some("Amazing grace how sweet the sound".to_string()));
    }

    #[test]
    fn test_song_creation_without_id() {
        let song = Song {
            id: None,
            title: "Test Song".to_string(),
            lyrics: Some("Test lyrics".to_string()),
        };

        assert_eq!(song.id, None);
        assert_eq!(song.title, "Test Song");
    }

    #[test]
    fn test_song_creation_without_lyrics() {
        let song = Song {
            id: Some(1),
            title: "Instrumental".to_string(),
            lyrics: None,
        };

        assert_eq!(song.lyrics, None);
    }

    #[test]
    fn test_song_clone() {
        let song = Song {
            id: Some(1),
            title: "Test".to_string(),
            lyrics: Some("lyrics".to_string()),
        };

        let cloned = song.clone();
        assert_eq!(song, cloned);
    }

    #[test]
    fn test_song_serialization() {
        let song = Song {
            id: Some(1),
            title: "Test Song".to_string(),
            lyrics: Some("Test lyrics".to_string()),
        };

        let json = serde_json::to_string(&song).unwrap();
        assert!(json.contains("Test Song"));
        assert!(json.contains("Test lyrics"));
    }

    #[test]
    fn test_song_deserialization() {
        let json = r#"{"id":1,"title":"Test Song","lyrics":"Test lyrics"}"#;
        let song: Song = serde_json::from_str(json).unwrap();

        assert_eq!(song.id, Some(1));
        assert_eq!(song.title, "Test Song");
        assert_eq!(song.lyrics, Some("Test lyrics".to_string()));
    }
}

#[cfg(test)]
mod track_tests {
    use super::*;

    #[test]
    fn test_track_creation() {
        let track = Track {
            id: Some(1),
            song_id: 100,
            file_path: "/path/to/track.ogg".to_string(),
            track_name: Some("Lead Vocal".to_string()),
        };

        assert_eq!(track.id, Some(1));
        assert_eq!(track.song_id, 100);
        assert_eq!(track.file_path, "/path/to/track.ogg");
        assert_eq!(track.track_name, Some("Lead Vocal".to_string()));
    }

    #[test]
    fn test_track_without_name() {
        let track = Track {
            id: None,
            song_id: 1,
            file_path: "/path/to/track.ogg".to_string(),
            track_name: None,
        };

        assert_eq!(track.track_name, None);
    }

    #[test]
    fn test_track_serialization() {
        let track = Track {
            id: Some(1),
            song_id: 100,
            file_path: "/path/to/track.ogg".to_string(),
            track_name: Some("Lead Vocal".to_string()),
        };

        let json = serde_json::to_string(&track).unwrap();
        assert!(json.contains("Lead Vocal"));
        assert!(json.contains("/path/to/track.ogg"));
    }
}

#[cfg(test)]
mod presentation_tests {
    use super::*;

    #[test]
    fn test_presentation_creation() {
        let presentation = Presentation {
            id: Some(1),
            name: "Sunday Service".to_string(),
            path: "/presentations/sunday".to_string(),
            category: "Sermon".to_string(),
        };

        assert_eq!(presentation.id, Some(1));
        assert_eq!(presentation.name, "Sunday Service");
        assert_eq!(presentation.path, "/presentations/sunday");
        assert_eq!(presentation.category, "Sermon");
    }

    #[test]
    fn test_presentation_clone() {
        let presentation = Presentation {
            id: Some(1),
            name: "Test".to_string(),
            path: "/test".to_string(),
            category: "Test".to_string(),
        };

        let cloned = presentation.clone();
        assert_eq!(presentation, cloned);
    }
}

#[cfg(test)]
mod macro_tests {
    use super::*;

    #[test]
    fn test_macro_creation() {
        let macro_entity = Macro {
            id: Some(1),
            name: "Fade In".to_string(),
            action: "fade_in_500ms".to_string(),
        };

        assert_eq!(macro_entity.id, Some(1));
        assert_eq!(macro_entity.name, "Fade In");
        assert_eq!(macro_entity.action, "fade_in_500ms");
    }
}

#[cfg(test)]
mod setting_tests {
    use super::*;

    #[test]
    fn test_setting_creation() {
        let setting = Setting {
            key: "volume".to_string(),
            value: "80".to_string(),
        };

        assert_eq!(setting.key, "volume");
        assert_eq!(setting.value, "80");
    }

    #[test]
    fn test_setting_serialization() {
        let setting = Setting {
            key: "theme".to_string(),
            value: "dark".to_string(),
        };

        let json = serde_json::to_string(&setting).unwrap();
        assert!(json.contains("theme"));
        assert!(json.contains("dark"));
    }
}

#[cfg(test)]
mod schedule_event_tests {
    use super::*;

    #[test]
    fn test_schedule_event_creation() {
        let event = ScheduleEvent {
            id: Some(1),
            event_time: "2024-10-14T10:00:00".to_string(),
            event_type: "song_start".to_string(),
            target_id: "song_123".to_string(),
        };

        assert_eq!(event.id, Some(1));
        assert_eq!(event.event_time, "2024-10-14T10:00:00");
        assert_eq!(event.event_type, "song_start");
        assert_eq!(event.target_id, "song_123");
    }
}

#[cfg(test)]
mod youtube_link_tests {
    use super::*;

    #[test]
    fn test_youtube_link_creation() {
        let link = YouTubeLink {
            id: Some(1),
            presentation_id: 100,
            url: "https://youtube.com/watch?v=abc123".to_string(),
        };

        assert_eq!(link.id, Some(1));
        assert_eq!(link.presentation_id, 100);
        assert_eq!(link.url, "https://youtube.com/watch?v=abc123");
    }
}

#[cfg(test)]
mod song_details_tests {
    use super::*;

    #[test]
    fn test_song_details_creation() {
        let track1 = Track {
            id: Some(1),
            song_id: 100,
            file_path: "/track1.ogg".to_string(),
            track_name: Some("Vocals".to_string()),
        };

        let track2 = Track {
            id: Some(2),
            song_id: 100,
            file_path: "/track2.ogg".to_string(),
            track_name: Some("Guitar".to_string()),
        };

        let details = SongDetails {
            id: 100,
            title: "Test Song".to_string(),
            lyrics: Some("Test lyrics".to_string()),
            tracks: vec![track1, track2],
        };

        assert_eq!(details.id, 100);
        assert_eq!(details.title, "Test Song");
        assert_eq!(details.tracks.len(), 2);
    }

    #[test]
    fn test_song_details_with_no_tracks() {
        let details = SongDetails {
            id: 100,
            title: "Empty Song".to_string(),
            lyrics: None,
            tracks: vec![],
        };

        assert_eq!(details.tracks.len(), 0);
    }
}

#[cfg(test)]
mod search_result_tests {
    use super::*;

    #[test]
    fn test_song_search_result() {
        let result = SongSearchResult {
            id: 1,
            title: "Test Song".to_string(),
        };

        assert_eq!(result.id, 1);
        assert_eq!(result.title, "Test Song");
    }

    #[test]
    fn test_presentation_search_result() {
        let result = PresentationSearchResult {
            id: 1,
            name: "Test Presentation".to_string(),
            path: "/test/path".to_string(),
        };

        assert_eq!(result.id, 1);
        assert_eq!(result.name, "Test Presentation");
        assert_eq!(result.path, "/test/path");
    }
}
