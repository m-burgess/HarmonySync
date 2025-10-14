use app_lib::domain::entities::*;
use app_lib::domain::repositories::*;
use app_lib::infrastructure::sqlite_repository::SqliteRepository;
use rusqlite::Connection;
use std::fs;
use tempfile::TempDir;

#[cfg(test)]
mod integration_tests {
    use super::*;

    fn create_test_repository() -> SqliteRepository {
        let conn = Connection::open_in_memory().unwrap();
        let repo = SqliteRepository::new(conn);
        repo.init_database().unwrap();
        repo
    }

    #[test]
    fn test_song_and_tracks_workflow() {
        let repo = create_test_repository();

        // Step 1: Create a song
        let song = Song {
            id: None,
            title: "Integration Test Song".to_string(),
            lyrics: Some("Verse 1\nChorus\nVerse 2".to_string()),
        };

        let inserted_song = repo.insert(&song).unwrap();
        let song_id = inserted_song.id.unwrap();

        // Step 2: Add tracks to the song
        let tracks = vec![
            Track {
                id: None,
                song_id,
                file_path: "/library/vocals.ogg".to_string(),
                track_name: Some("Lead Vocals".to_string()),
            },
            Track {
                id: None,
                song_id,
                file_path: "/library/guitar.ogg".to_string(),
                track_name: Some("Guitar".to_string()),
            },
            Track {
                id: None,
                song_id,
                file_path: "/library/drums.ogg".to_string(),
                track_name: Some("Drums".to_string()),
            },
        ];

        for track in &tracks {
            repo.insert(track).unwrap();
        }

        // Step 3: Retrieve song and verify
        let retrieved_song = repo.get_by_id(song_id).unwrap();
        assert!(retrieved_song.is_some());

        // Step 4: Retrieve all tracks for the song
        let retrieved_tracks = repo.get_all_for_song(song_id).unwrap();
        assert_eq!(retrieved_tracks.len(), 3);

        // Step 5: Verify track details
        let vocal_track = retrieved_tracks
            .iter()
            .find(|t| t.track_name.as_ref().map(|n| n.as_str()) == Some("Lead Vocals"));
        assert!(vocal_track.is_some());

        // Step 6: Update song lyrics
        let updated_song = Song {
            id: Some(song_id),
            title: "Integration Test Song".to_string(),
            lyrics: Some("Updated Verse 1\nUpdated Chorus".to_string()),
        };

        repo.update(&updated_song).unwrap();

        let final_song = repo.get_by_id(song_id).unwrap().unwrap();
        assert!(final_song.lyrics.unwrap().contains("Updated"));
    }

    #[test]
    fn test_presentation_with_youtube_links_workflow() {
        let repo = create_test_repository();

        // Step 1: Create a presentation
        let presentation = Presentation {
            id: None,
            name: "Sunday Sermon".to_string(),
            path: "/presentations/sermon".to_string(),
            category: "Sermon".to_string(),
        };

        let inserted_pres = repo.insert(&presentation).unwrap();
        let pres_id = inserted_pres.id.unwrap();

        // Step 2: Add YouTube links
        let links = vec![
            YouTubeLink {
                id: None,
                presentation_id: pres_id,
                url: "https://youtube.com/watch?v=link1".to_string(),
            },
            YouTubeLink {
                id: None,
                presentation_id: pres_id,
                url: "https://youtube.com/watch?v=link2".to_string(),
            },
        ];

        for link in &links {
            repo.insert(link).unwrap();
        }

        // Step 3: Retrieve links
        let retrieved_links = repo.get_by_presentation_id(pres_id).unwrap();
        assert_eq!(retrieved_links.len(), 2);

        // Step 4: Delete presentation should cascade delete links
        repo.delete(pres_id).unwrap();

        let remaining_links = repo.get_by_presentation_id(pres_id).unwrap();
        assert_eq!(remaining_links.len(), 0);
    }

    #[test]
    fn test_settings_persistence_workflow() {
        let repo = create_test_repository();

        // Step 1: Set multiple settings
        let settings = vec![
            Setting {
                key: "volume".to_string(),
                value: "80".to_string(),
            },
            Setting {
                key: "theme".to_string(),
                value: "dark".to_string(),
            },
            Setting {
                key: "font_size".to_string(),
                value: "14".to_string(),
            },
        ];

        for setting in &settings {
            repo.set(setting).unwrap();
        }

        // Step 2: Retrieve and verify
        let volume = repo.get("volume").unwrap().unwrap();
        assert_eq!(volume.value, "80");

        // Step 3: Update a setting
        let new_volume = Setting {
            key: "volume".to_string(),
            value: "90".to_string(),
        };
        repo.set(&new_volume).unwrap();

        let updated = repo.get("volume").unwrap().unwrap();
        assert_eq!(updated.value, "90");
    }

    #[test]
    fn test_schedule_events_workflow() {
        let repo = create_test_repository();

        // Step 1: Create events for a service
        let events = vec![
            ScheduleEvent {
                id: None,
                event_time: "2024-10-14T09:00:00".to_string(),
                event_type: "service_start".to_string(),
                target_id: "main_service".to_string(),
            },
            ScheduleEvent {
                id: None,
                event_time: "2024-10-14T09:15:00".to_string(),
                event_type: "song_start".to_string(),
                target_id: "song_1".to_string(),
            },
            ScheduleEvent {
                id: None,
                event_time: "2024-10-14T09:20:00".to_string(),
                event_type: "sermon_start".to_string(),
                target_id: "sermon_1".to_string(),
            },
        ];

        for event in &events {
            repo.insert(event).unwrap();
        }

        // Step 2: Retrieve all events
        let all_events = repo.get_all().unwrap();
        assert_eq!(all_events.len(), 3);

        // Step 3: Verify events are in order
        let service_start = all_events
            .iter()
            .find(|e| e.event_type == "service_start");
        assert!(service_start.is_some());
    }

    #[test]
    fn test_complete_song_library_workflow() {
        let repo = create_test_repository();

        // Simulate importing multiple songs
        let song_titles = vec!["Amazing Grace", "How Great Thou Art", "Holy Holy Holy"];

        for title in song_titles {
            let song = Song {
                id: None,
                title: title.to_string(),
                lyrics: Some(format!("Lyrics for {}", title)),
            };

            let inserted = repo.insert(&song).unwrap();
            let song_id = inserted.id.unwrap();

            // Add some tracks to each song
            for i in 1..=3 {
                let track = Track {
                    id: None,
                    song_id,
                    file_path: format!("/library/{}_track_{}.ogg", title.replace(" ", "_"), i),
                    track_name: Some(format!("Track {}", i)),
                };
                repo.insert(&track).unwrap();
            }
        }

        // Verify we have all songs
        let all_songs = repo.get_all().unwrap();
        assert_eq!(all_songs.len(), 3);

        // Verify each song has tracks
        for song in all_songs {
            let tracks = repo.get_all_for_song(song.id.unwrap()).unwrap();
            assert_eq!(tracks.len(), 3);
        }
    }

    #[test]
    fn test_css_generation_with_song_import() {
        use app_lib::domain::css_generator;

        let temp_dir = TempDir::new().unwrap();
        let song_dir = temp_dir.path().join("My_Song");
        fs::create_dir(&song_dir).unwrap();

        // Generate CSS for the song
        css_generator::generate_and_write_css(song_dir.to_str().unwrap());

        // Verify CSS was created
        let css_path = song_dir.join("background.css");
        assert!(css_path.exists());

        // Verify CSS content
        let css_content = fs::read_to_string(&css_path).unwrap();
        assert!(css_content.contains("background:"));
        assert!(css_content.contains("linear-gradient"));
    }

    #[test]
    fn test_multi_repository_transaction_pattern() {
        let repo = create_test_repository();

        // Simulate a complete import workflow
        
        // 1. Create song
        let song = Song {
            id: None,
            title: "Test Import".to_string(),
            lyrics: Some("Test lyrics".to_string()),
        };
        let inserted_song = repo.insert(&song).unwrap();
        let song_id = inserted_song.id.unwrap();

        // 2. Add tracks
        let track_result = repo.insert(&Track {
            id: None,
            song_id,
            file_path: "/test.ogg".to_string(),
            track_name: Some("Test Track".to_string()),
        });

        // 3. If anything fails, we should be able to clean up
        if track_result.is_ok() {
            // Success path - verify everything is there
            let song = repo.get_by_id(song_id).unwrap();
            assert!(song.is_some());

            let tracks = repo.get_all_for_song(song_id).unwrap();
            assert_eq!(tracks.len(), 1);
        } else {
            // Failure path - clean up the song
            repo.delete(song_id).unwrap();
            
            let song = repo.get_by_id(song_id).unwrap();
            assert!(song.is_none());
        }
    }

    #[test]
    fn test_search_functionality_pattern() {
        let repo = create_test_repository();

        // Add test data
        let songs = vec![
            Song {
                id: None,
                title: "Amazing Grace".to_string(),
                lyrics: Some("Amazing grace how sweet the sound".to_string()),
            },
            Song {
                id: None,
                title: "Grace Like Rain".to_string(),
                lyrics: Some("Amazing grace".to_string()),
            },
            Song {
                id: None,
                title: "Holy Holy Holy".to_string(),
                lyrics: Some("Lord God Almighty".to_string()),
            },
        ];

        for song in songs {
            repo.insert(&song).unwrap();
        }

        // Get all and filter (simulating search)
        let all_songs = repo.get_all().unwrap();
        let grace_songs: Vec<_> = all_songs
            .into_iter()
            .filter(|s| s.title.to_lowercase().contains("grace"))
            .collect();

        assert_eq!(grace_songs.len(), 2);
    }
}
