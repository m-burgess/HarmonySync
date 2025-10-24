// Basic tests for Carla plugin manager prototype

#[cfg(test)]
mod carla_plugin_manager_tests {
    use crate::application::carla_plugin_manager::*;

    #[tokio::test]
    async fn test_plugin_manager_creation() {
        let manager = CarlaPluginManager::new();
        let plugins = manager.get_loaded_plugins().await;
        assert_eq!(plugins.len(), 0, "New manager should have no plugins");
    }

    #[tokio::test]
    async fn test_load_plugin() {
        let manager = CarlaPluginManager::new();
        
        let plugin_id = manager
            .load_plugin("/path/to/plugin.vst".to_string(), "Test Plugin".to_string())
            .await
            .expect("Failed to load plugin");
        
        assert!(!plugin_id.is_empty(), "Plugin ID should not be empty");
        
        let plugins = manager.get_loaded_plugins().await;
        assert_eq!(plugins.len(), 1, "Should have one plugin loaded");
        assert_eq!(plugins[0].name, "Test Plugin");
        assert_eq!(plugins[0].plugin_type, "VST");
    }

    #[tokio::test]
    async fn test_unload_plugin() {
        let manager = CarlaPluginManager::new();
        
        let plugin_id = manager
            .load_plugin("/path/to/plugin.vst".to_string(), "Test Plugin".to_string())
            .await
            .expect("Failed to load plugin");
        
        manager.unload_plugin(plugin_id)
            .await
            .expect("Failed to unload plugin");
        
        let plugins = manager.get_loaded_plugins().await;
        assert_eq!(plugins.len(), 0, "Should have no plugins after unload");
    }

    #[tokio::test]
    async fn test_midi_routing() {
        let manager = CarlaPluginManager::new();
        
        let plugin_id = manager
            .load_plugin("/path/to/plugin.vst".to_string(), "Test Plugin".to_string())
            .await
            .expect("Failed to load plugin");
        
        manager
            .set_midi_routing(
                plugin_id.clone(),
                "midi_in_0".to_string(),
                "Test MIDI Device".to_string(),
                1,
            )
            .await
            .expect("Failed to set MIDI routing");
        
        let plugins = manager.get_loaded_plugins().await;
        let plugin = &plugins[0];
        
        assert!(plugin.midi_routing.is_some());
        let midi_routing = plugin.midi_routing.as_ref().unwrap();
        assert_eq!(midi_routing.device_id, "midi_in_0");
        assert_eq!(midi_routing.channel, 1);
    }

    #[tokio::test]
    async fn test_audio_routing() {
        let manager = CarlaPluginManager::new();
        
        let plugin_id = manager
            .load_plugin("/path/to/plugin.vst".to_string(), "Test Plugin".to_string())
            .await
            .expect("Failed to load plugin");
        
        manager
            .set_audio_routing(plugin_id.clone(), vec![0, 1])
            .await
            .expect("Failed to set audio routing");
        
        let plugins = manager.get_loaded_plugins().await;
        let plugin = &plugins[0];
        
        assert!(plugin.audio_routing.is_some());
        let audio_routing = plugin.audio_routing.as_ref().unwrap();
        assert_eq!(audio_routing.output_channels, vec![0, 1]);
    }

    #[tokio::test]
    async fn test_memory_stats() {
        let manager = CarlaPluginManager::new();
        
        // Load a few plugins
        manager
            .load_plugin("/path/to/plugin1.vst".to_string(), "Plugin 1".to_string())
            .await
            .expect("Failed to load plugin 1");
        
        manager
            .load_plugin("/path/to/plugin2.vst".to_string(), "Plugin 2".to_string())
            .await
            .expect("Failed to load plugin 2");
        
        let stats = manager.get_memory_stats().await.expect("Failed to get stats");
        
        assert_eq!(stats.per_plugin_usage.len(), 2, "Should have stats for 2 plugins");
        assert_eq!(stats.plugins_used_mb, 200, "Total plugin memory should be 200 MB (2 x 100)");
    }

    #[tokio::test]
    async fn test_plugin_type_detection() {
        let manager = CarlaPluginManager::new();
        
        // Test VST
        let vst_id = manager
            .load_plugin("/path/to/plugin.vst".to_string(), "VST Plugin".to_string())
            .await
            .unwrap();
        
        // Test VST3
        let vst3_id = manager
            .load_plugin("/path/to/plugin.vst3".to_string(), "VST3 Plugin".to_string())
            .await
            .unwrap();
        
        // Test LV2
        let lv2_id = manager
            .load_plugin("/path/to/plugin.lv2".to_string(), "LV2 Plugin".to_string())
            .await
            .unwrap();
        
        let plugins = manager.get_loaded_plugins().await;
        
        let vst = plugins.iter().find(|p| p.id == vst_id).unwrap();
        assert_eq!(vst.plugin_type, "VST");
        
        let vst3 = plugins.iter().find(|p| p.id == vst3_id).unwrap();
        assert_eq!(vst3.plugin_type, "VST");
        
        let lv2 = plugins.iter().find(|p| p.id == lv2_id).unwrap();
        assert_eq!(lv2.plugin_type, "LV2");
    }
}

#[cfg(test)]
mod midi_manager_tests {
    use crate::application::midi_manager::*;

    #[test]
    fn test_midi_manager_creation() {
        let manager = MidiManager::new();
        assert!(manager.is_ok(), "MIDI manager should be created successfully");
    }

    #[test]
    fn test_get_input_devices() {
        let manager = MidiManager::new().unwrap();
        let devices = manager.get_input_devices().unwrap();
        
        // Prototype returns 2 mock devices
        assert_eq!(devices.len(), 2, "Should return 2 mock input devices");
        assert!(devices[0].is_input, "First device should be an input");
        assert!(devices[1].is_input, "Second device should be an input");
    }

    #[test]
    fn test_get_output_devices() {
        let manager = MidiManager::new().unwrap();
        let devices = manager.get_output_devices().unwrap();
        
        // Prototype returns 1 mock device
        assert_eq!(devices.len(), 1, "Should return 1 mock output device");
        assert!(!devices[0].is_input, "Device should be an output");
    }

    #[test]
    fn test_parse_message_type() {
        assert_eq!(MidiManager::parse_message_type(0x90), "Note On");
        assert_eq!(MidiManager::parse_message_type(0x80), "Note Off");
        assert_eq!(MidiManager::parse_message_type(0xB0), "Control Change");
        assert_eq!(MidiManager::parse_message_type(0xC0), "Program Change");
        assert_eq!(MidiManager::parse_message_type(0xE0), "Pitch Bend");
    }
}

#[cfg(test)]
mod audio_router_tests {
    use crate::application::audio_router::*;

    #[tokio::test]
    async fn test_audio_router_creation() {
        let router = AudioRouter::new();
        let devices = router.get_audio_devices().await.unwrap();
        
        // Prototype returns 2 mock devices
        assert_eq!(devices.len(), 2, "Should return 2 mock audio devices");
    }

    #[tokio::test]
    async fn test_add_route() {
        let router = AudioRouter::new();
        
        let route = AudioRoute {
            plugin_id: "plugin1".to_string(),
            source_channel: 0,
            destination_device: "behringer_x18".to_string(),
            destination_channel: 0,
            gain_db: 0.0,
            enabled: true,
        };
        
        router.add_route(route).await.expect("Failed to add route");
        
        let routes = router.get_plugin_routes("plugin1").await;
        assert_eq!(routes.len(), 1, "Should have one route for plugin1");
    }

    #[tokio::test]
    async fn test_set_channel_strip() {
        let router = AudioRouter::new();
        
        let strip = ChannelStrip {
            gain_db: -6.0,
            pan: 0.5,
            mute: false,
            solo: false,
        };
        
        router
            .set_channel_strip("plugin1", strip.clone())
            .await
            .expect("Failed to set channel strip");
        
        let retrieved = router.get_channel_strip("plugin1").await;
        assert!(retrieved.is_some());
        
        let retrieved_strip = retrieved.unwrap();
        assert_eq!(retrieved_strip.gain_db, -6.0);
        assert_eq!(retrieved_strip.pan, 0.5);
    }
}
