// Carla Plugin Manager - Manages plugin lifecycle and state
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use anyhow::{Result, anyhow};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Plugin {
    pub id: String,
    pub name: String,
    pub path: String,
    pub plugin_type: String,
    pub enabled: bool,
    pub is_active: bool,
    pub memory_usage_mb: u64,
    pub midi_routing: Option<MidiRoutingInfo>,
    pub audio_routing: Option<AudioRoutingInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MidiRoutingInfo {
    pub device_id: String,
    pub device_name: String,
    pub channel: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioRoutingInfo {
    pub output_channels: Vec<usize>,
    pub gain_db: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryStats {
    pub total_system_mb: u64,
    pub total_used_mb: u64,
    pub available_mb: u64,
    pub harmonysync_used_mb: u64,
    pub plugins_used_mb: u64,
    pub per_plugin_usage: HashMap<String, u64>,
}

pub struct CarlaPluginManager {
    plugins: Arc<Mutex<HashMap<String, Plugin>>>,
}

impl CarlaPluginManager {
    pub fn new() -> Self {
        Self {
            plugins: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Load a plugin from a file path
    pub async fn load_plugin(&self, plugin_path: String, name: String) -> Result<String> {
        let plugin_id = uuid::Uuid::new_v4().to_string();
        
        // Determine plugin type from extension
        let plugin_type = if plugin_path.ends_with(".vst") || plugin_path.ends_with(".vst3") {
            "VST"
        } else if plugin_path.ends_with(".lv2") {
            "LV2"
        } else if plugin_path.ends_with(".so") || plugin_path.ends_with(".dll") {
            "VST"
        } else {
            "Unknown"
        };

        let plugin = Plugin {
            id: plugin_id.clone(),
            name,
            path: plugin_path,
            plugin_type: plugin_type.to_string(),
            enabled: true,
            is_active: true,
            memory_usage_mb: 100, // Placeholder - would be actual measurement
            midi_routing: None,
            audio_routing: Some(AudioRoutingInfo {
                output_channels: vec![0, 1], // Default stereo output
                gain_db: 0.0,
            }),
        };

        let mut plugins = self.plugins.lock().await;
        plugins.insert(plugin_id.clone(), plugin);

        Ok(plugin_id)
    }

    /// Unload a plugin
    pub async fn unload_plugin(&self, plugin_id: String) -> Result<()> {
        let mut plugins = self.plugins.lock().await;
        plugins.remove(&plugin_id)
            .ok_or_else(|| anyhow!("Plugin not found: {}", plugin_id))?;
        Ok(())
    }

    /// Get all loaded plugins
    pub async fn get_loaded_plugins(&self) -> Vec<Plugin> {
        let plugins = self.plugins.lock().await;
        plugins.values().cloned().collect()
    }

    /// Set MIDI routing for a plugin
    pub async fn set_midi_routing(
        &self,
        plugin_id: String,
        device_id: String,
        device_name: String,
        channel: u8,
    ) -> Result<()> {
        let mut plugins = self.plugins.lock().await;
        
        let plugin = plugins.get_mut(&plugin_id)
            .ok_or_else(|| anyhow!("Plugin not found: {}", plugin_id))?;

        plugin.midi_routing = Some(MidiRoutingInfo {
            device_id,
            device_name,
            channel,
        });

        Ok(())
    }

    /// Set audio routing for a plugin
    pub async fn set_audio_routing(
        &self,
        plugin_id: String,
        output_channels: Vec<usize>,
    ) -> Result<()> {
        let mut plugins = self.plugins.lock().await;
        
        let plugin = plugins.get_mut(&plugin_id)
            .ok_or_else(|| anyhow!("Plugin not found: {}", plugin_id))?;

        if let Some(ref mut routing) = plugin.audio_routing {
            routing.output_channels = output_channels;
        } else {
            plugin.audio_routing = Some(AudioRoutingInfo {
                output_channels,
                gain_db: 0.0,
            });
        }

        Ok(())
    }

    /// Get memory statistics
    pub async fn get_memory_stats(&self) -> Result<MemoryStats> {
        let plugins = self.plugins.lock().await;
        
        let mut per_plugin_usage = HashMap::new();
        let mut total_plugin_memory = 0u64;
        
        for (id, plugin) in plugins.iter() {
            per_plugin_usage.insert(id.clone(), plugin.memory_usage_mb);
            total_plugin_memory += plugin.memory_usage_mb;
        }

        // Use sysinfo crate for actual system memory if needed
        // For now, return placeholder values
        Ok(MemoryStats {
            total_system_mb: 16384,
            total_used_mb: 8192,
            available_mb: 8192,
            harmonysync_used_mb: 300,
            plugins_used_mb: total_plugin_memory,
            per_plugin_usage,
        })
    }
}

// Global plugin manager instance
use once_cell::sync::Lazy;

static PLUGIN_MANAGER: Lazy<Arc<Mutex<Option<CarlaPluginManager>>>> =
    Lazy::new(|| Arc::new(Mutex::new(None)));

pub async fn get_plugin_manager() -> Arc<Mutex<Option<CarlaPluginManager>>> {
    PLUGIN_MANAGER.clone()
}

pub async fn initialize_plugin_manager() -> Result<()> {
    let manager = CarlaPluginManager::new();
    let mut global = PLUGIN_MANAGER.lock().await;
    *global = Some(manager);
    Ok(())
}
